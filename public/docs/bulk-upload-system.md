# Bulk Report Upload & Auto-Mapping System

Complete implementation guide for a bulk report upload system with AI-powered PDF content extraction and automatic document matching.

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Edge Function](#edge-function)
4. [Frontend Component](#frontend-component)
5. [Dependencies](#dependencies)
6. [Configuration](#configuration)

---

## Overview

This system allows admin/staff to upload multiple PDF reports (or ZIP files containing PDFs) that automatically match to existing documents in the database based on filename patterns and PDF content analysis.

### Key Features
- **Drag & Drop Upload**: Support for PDF files and ZIP archives
- **ZIP Extraction**: Automatically extracts PDFs from ZIP files using JSZip
- **Two-Stage Matching**:
  - **Stage 1**: Document grouping by normalized filename
  - **Stage 2**: Report type classification by reading PDF page 2 content
- **Auto-Complete**: Marks documents as completed when both reports are attached
- **Notifications**: Sends email, push, and in-app notifications on completion
- **Unmatched Handling**: Stores unmatched reports for manual review

---

## Database Schema

### Documents Table (Required Columns)

```sql
-- Add these columns to your documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS normalized_filename TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS similarity_report_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_report_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS similarity_percentage NUMERIC;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_percentage NUMERIC;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create enum for document status if not exists
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status document_status DEFAULT 'pending';
```

### Unmatched Reports Table

```sql
CREATE TABLE IF NOT EXISTS public.unmatched_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  normalized_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  report_type TEXT,
  matched_document_id UUID REFERENCES public.documents(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unmatched_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage unmatched reports" ON public.unmatched_reports
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view unmatched reports" ON public.unmatched_reports
FOR SELECT USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert unmatched reports" ON public.unmatched_reports
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
```

### Filename Normalization Function

```sql
CREATE OR REPLACE FUNCTION public.normalize_filename(filename text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result text;
BEGIN
  -- Convert to lowercase
  result := lower(filename);
  
  -- Remove file extension
  result := regexp_replace(result, '\.[^.]+$', '');
  
  -- Trim whitespace
  result := trim(result);
  
  RETURN result;
END;
$$;

-- Trigger to auto-set normalized_filename
CREATE OR REPLACE FUNCTION public.set_normalized_filename()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.normalized_filename := public.normalize_filename(NEW.file_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_normalized_filename_trigger
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.set_normalized_filename();
```

### Storage Bucket

```sql
-- Create reports bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for reports bucket
CREATE POLICY "Staff can upload reports" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'reports' AND 
  (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Staff can read reports" ON storage.objects
FOR SELECT USING (
  bucket_id = 'reports' AND 
  (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can read own reports" ON storage.objects
FOR SELECT USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE (d.similarity_report_path = name OR d.ai_report_path = name)
    AND d.user_id = auth.uid()
  )
);
```

---

## Edge Function

Create file: `supabase/functions/process-bulk-reports/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportFile {
  fileName: string;
  filePath: string;
}

interface ProcessedReport {
  fileName: string;
  filePath: string;
  documentKey: string | null;
  reportType: 'similarity' | 'ai' | 'unknown';
  percentage: number | null;
  matchedDocumentId: string | null;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  processed: ProcessedReport[];
  mapped: { documentId: string; fileName: string; reportType: string; percentage: number | null }[];
  unmatched: { fileName: string; documentKey: string | null; reason: string }[];
  completedDocuments: string[];
  stats: {
    totalReports: number;
    mappedCount: number;
    unmatchedCount: number;
    completedCount: number;
    unknownTypeCount: number;
  };
}

interface DocumentRecord {
  id: string;
  file_name: string;
  normalized_filename: string | null;
  original_file_name: string | null;
  is_pdf_original: boolean | null;
  user_id: string | null;
  similarity_report_path: string | null;
  ai_report_path: string | null;
  similarity_percentage: number | null;
  ai_percentage: number | null;
  status: string;
  needs_review: boolean | null;
  document_key?: string;
}

// =============================
// STAGE 1: DOCUMENT KEY EXTRACTION
// =============================

/**
 * Extract document key from filename using normalization rules:
 * 1. Remove file extension
 * 2. Remove trailing numbers in round brackets (e.g. (1), (2), (45))
 * 3. Remove extra spaces
 * 4. Remove surrounding brackets if present: (), []
 * 5. Normalize casing and spaces
 * 
 * Examples:
 * - "(Reflective Writing).pdf" → "reflective writing"
 * - "TOKPD (11).pdf" → "tokpd"
 * - "[Guest] Document (45).docx" → "guest document"
 */
function extractDocumentKey(filename: string): string {
  if (!filename) return '';
  
  let key = filename;
  
  // Step 1: Remove file extension
  key = key.replace(/\.[^.]+$/, '');
  
  // Step 2: Remove trailing numbers in round brackets
  key = key.replace(/\s*\(\d+\)\s*$/g, '');
  key = key.replace(/\(\d+\)$/g, '');
  
  // Step 3: Trim extra spaces
  key = key.trim();
  
  // Step 4: Remove surrounding brackets
  if (key.startsWith('(') && key.endsWith(')')) {
    key = key.slice(1, -1);
  }
  if (key.startsWith('[') && key.endsWith(']')) {
    key = key.slice(1, -1);
  }
  
  // Handle [Guest] prefix pattern
  key = key.replace(/^\[.*?\]\s*/g, '');
  
  // Step 5: Normalize - lowercase and collapse multiple spaces
  key = key.toLowerCase();
  key = key.replace(/\s+/g, ' ');
  key = key.trim();
  
  return key;
}

/**
 * Extract text from a specific page of a PDF using pdfjs-serverless
 */
async function extractTextFromPage(pdfData: Uint8Array, pageNumber: number): Promise<string> {
  try {
    const { getDocument } = await import("https://esm.sh/pdfjs-serverless");
    
    const doc = await getDocument({
      data: pdfData,
      useSystemFonts: true,
    }).promise;
    
    if (pageNumber > doc.numPages) {
      console.log(`Page ${pageNumber} does not exist (PDF has ${doc.numPages} pages)`);
      return '';
    }
    
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    const text = textContent.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str || '')
      .join(' ');
    
    console.log(`Extracted ${text.length} chars from page ${pageNumber}`);
    return text;
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    return '';
  }
}

// =============================
// STAGE 2: REPORT CLASSIFICATION
// =============================

/**
 * Classify report type and extract percentage from page 2 text.
 * 
 * Similarity Report indicators:
 * - "overall similarity"
 * - "match groups"
 * - "integrity overview"
 * 
 * AI Report indicators:
 * - "detected as ai"
 * - "ai writing overview"
 * - "detection groups"
 */
function classifyReportFromContent(page2Text: string): { 
  reportType: 'similarity' | 'ai' | 'unknown'; 
  percentage: number | null;
  confidence: string;
} {
  if (!page2Text || page2Text.trim().length < 10) {
    console.log('Page 2 text is empty or too short for classification');
    return { reportType: 'unknown', percentage: null, confidence: 'no_text' };
  }
  
  const normalizedText = page2Text.toLowerCase().replace(/\s+/g, ' ');
  
  // SIMILARITY REPORT DETECTION
  const similarityIndicators = [
    'overall similarity',
    'match groups',
    'integrity overview'
  ];
  
  const hasSimilarityIndicator = similarityIndicators.some(indicator => 
    normalizedText.includes(indicator)
  );
  
  if (hasSimilarityIndicator) {
    const simPattern = /(\d{1,3})\s*%\s*overall\s*similarity/i;
    const simMatch = page2Text.match(simPattern);
    let percentage: number | null = null;
    
    if (simMatch) {
      const parsed = parseInt(simMatch[1], 10);
      if (parsed >= 0 && parsed <= 100) {
        percentage = parsed;
      }
    }
    
    console.log(`Classified as SIMILARITY report, percentage: ${percentage}`);
    return { reportType: 'similarity', percentage, confidence: 'high' };
  }
  
  // AI REPORT DETECTION
  const aiIndicators = [
    'detected as ai',
    'ai writing overview',
    'detection groups'
  ];
  
  const hasAiIndicator = aiIndicators.some(indicator => 
    normalizedText.includes(indicator)
  );
  
  if (hasAiIndicator) {
    const aiPattern = /(\d{1,3})\s*%\s*detected\s*as\s*ai/i;
    const aiMatch = page2Text.match(aiPattern);
    let percentage: number | null = null;
    
    if (aiMatch) {
      const parsed = parseInt(aiMatch[1], 10);
      if (parsed >= 0 && parsed <= 100) {
        percentage = parsed;
      }
    }
    
    // Special case: "*% detected as AI" means NULL percentage
    if (page2Text.includes('*%') && normalizedText.includes('detected as ai')) {
      percentage = null;
    }
    
    console.log(`Classified as AI report, percentage: ${percentage}`);
    return { reportType: 'ai', percentage, confidence: 'high' };
  }
  
  console.log('Could not classify report type from page 2 content');
  return { reportType: 'unknown', percentage: null, confidence: 'none' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is staff or admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'staff')) {
      return new Response(JSON.stringify({ error: 'Forbidden - Staff or Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reports } = await req.json() as { reports: ReportFile[] };

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return new Response(JSON.stringify({ error: 'No reports provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`\n========================================`);
    console.log(`Processing ${reports.length} reports with two-stage logic`);
    console.log(`========================================\n`);

    // Fetch all pending and in_progress documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, normalized_filename, original_file_name, is_pdf_original, user_id, similarity_report_path, ai_report_path, similarity_percentage, ai_percentage, status, needs_review')
      .in('status', ['pending', 'in_progress']);

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw new Error('Failed to fetch documents');
    }

    console.log(`Found ${documents?.length || 0} pending/in_progress documents`);
    
    // Pre-compute document keys
    const documentsWithKeys: DocumentRecord[] = (documents || []).map(doc => ({
      ...doc,
      document_key: extractDocumentKey(doc.file_name)
    }));
    
    // Log document keys for debugging
    console.log('\nDocument keys:');
    documentsWithKeys.forEach(doc => {
      console.log(`  "${doc.file_name}" -> "${doc.document_key}"`);
    });

    const result: ProcessingResult = {
      success: true,
      processed: [],
      mapped: [],
      unmatched: [],
      completedDocuments: [],
      stats: {
        totalReports: reports.length,
        mappedCount: 0,
        unmatchedCount: 0,
        completedCount: 0,
        unknownTypeCount: 0,
      },
    };

    // Process each report
    for (const report of reports) {
      console.log(`\n=== Processing report: ${report.fileName} ===`);
      
      const processedReport: ProcessedReport = {
        fileName: report.fileName,
        filePath: report.filePath,
        documentKey: null,
        reportType: 'unknown',
        percentage: null,
        matchedDocumentId: null,
      };

      try {
        // STAGE 1: DOCUMENT GROUPING
        console.log('Stage 1: Extracting document key from report filename...');
        
        const reportKey = extractDocumentKey(report.fileName);
        processedReport.documentKey = reportKey;
        console.log(`  Report key: "${reportKey}"`);

        // Find matching document
        const matchedDoc = documentsWithKeys.find(doc => doc.document_key === reportKey);

        if (!matchedDoc) {
          console.log(`Stage 1 FAILED: No document found with key "${reportKey}"`);
          processedReport.error = 'No matching document found';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: reportKey || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey: reportKey, 
            reason: 'No matching document found' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        processedReport.matchedDocumentId = matchedDoc.id;
        console.log(`Stage 1 SUCCESS: Matched to document "${matchedDoc.file_name}" (id: ${matchedDoc.id})`);

        // STAGE 2: REPORT CLASSIFICATION
        console.log('Stage 2: Downloading PDF and classifying report type...');
        
        // Download the PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('reports')
          .download(report.filePath);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${report.fileName}:`, downloadError);
          processedReport.error = 'Failed to download file';
          result.processed.push(processedReport);
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey: reportKey, 
            reason: 'Failed to download file' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // Convert to Uint8Array
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        // Extract text from page 2 for classification
        const page2Text = await extractTextFromPage(pdfData, 2);
        console.log(`  Page 2 text length: ${page2Text.length} chars`);
        
        const { reportType, percentage, confidence } = classifyReportFromContent(page2Text);
        processedReport.reportType = reportType;
        processedReport.percentage = percentage;
        console.log(`Stage 2 result: type=${reportType}, percentage=${percentage}, confidence=${confidence}`);

        if (reportType === 'unknown') {
          result.stats.unknownTypeCount++;
          processedReport.error = 'Could not determine report type from PDF content';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports with matched document ID
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: reportKey || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            matched_document_id: matchedDoc.id,
            uploaded_by: user.id,
          });
          
          // Flag document for manual review
          await supabase
            .from('documents')
            .update({ 
              needs_review: true,
              review_reason: 'Report type could not be determined from PDF content'
            })
            .eq('id', matchedDoc.id);
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey: reportKey, 
            reason: 'Could not determine report type from PDF content' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // DATABASE UPDATE
        console.log('Updating database...');
        
        const updateData: Record<string, unknown> = {};
        
        if (reportType === 'similarity') {
          if (matchedDoc.similarity_report_path) {
            console.log(`Document ${matchedDoc.id} already has a similarity report, skipping`);
            processedReport.error = 'Document already has similarity report';
            result.processed.push(processedReport);
            continue;
          }
          updateData.similarity_report_path = report.filePath;
          if (percentage !== null) {
            updateData.similarity_percentage = percentage;
          }
        } else if (reportType === 'ai') {
          if (matchedDoc.ai_report_path) {
            console.log(`Document ${matchedDoc.id} already has an AI report, skipping`);
            processedReport.error = 'Document already has AI report';
            result.processed.push(processedReport);
            continue;
          }
          updateData.ai_report_path = report.filePath;
          if (percentage !== null) {
            updateData.ai_percentage = percentage;
          }
        }

        // Check if both reports will be present after this update
        const willHaveSimilarity = reportType === 'similarity' || matchedDoc.similarity_report_path;
        const willHaveAi = reportType === 'ai' || matchedDoc.ai_report_path;
        
        if (willHaveSimilarity && willHaveAi) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
          result.completedDocuments.push(matchedDoc.id);
          result.stats.completedCount++;
          console.log(`  Document will be marked as COMPLETED`);
        }

        // Update the document
        const { error: updateError } = await supabase
          .from('documents')
          .update(updateData)
          .eq('id', matchedDoc.id);

        if (updateError) {
          console.error(`Failed to update document ${matchedDoc.id}:`, updateError);
          processedReport.error = 'Failed to update document';
          result.processed.push(processedReport);
          result.stats.unmatchedCount++;
          continue;
        }

        // Update local document state for subsequent reports in same batch
        if (reportType === 'similarity') {
          matchedDoc.similarity_report_path = report.filePath;
          matchedDoc.similarity_percentage = percentage;
        } else if (reportType === 'ai') {
          matchedDoc.ai_report_path = report.filePath;
          matchedDoc.ai_percentage = percentage;
        }

        result.processed.push(processedReport);
        result.mapped.push({
          documentId: matchedDoc.id,
          fileName: report.fileName,
          reportType,
          percentage,
        });
        result.stats.mappedCount++;
        console.log(`SUCCESS: Report mapped to document ${matchedDoc.id}`);

        // Send notifications for completed documents
        if (willHaveSimilarity && willHaveAi && matchedDoc.user_id) {
          console.log('Sending completion notifications...');
          
          try {
            // Create user notification
            await supabase.from('user_notifications').insert({
              user_id: matchedDoc.user_id,
              title: 'Document Processing Complete',
              message: `Your document "${matchedDoc.file_name}" has been processed and is ready for download.`,
            });

            // Send push notification (optional - requires send-push-notification function)
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: matchedDoc.user_id,
                title: 'Document Ready',
                body: `Your document "${matchedDoc.file_name}" is ready for download.`,
                eventType: 'document_completed',
              },
            });

            // Send completion email (optional - requires send-completion-email function)
            await supabase.functions.invoke('send-completion-email', {
              body: { documentId: matchedDoc.id },
            });
          } catch (notifyError) {
            console.error('Error sending notifications:', notifyError);
          }
        }

      } catch (error) {
        console.error(`Error processing ${report.fileName}:`, error);
        processedReport.error = error instanceof Error ? error.message : 'Unknown error';
        result.processed.push(processedReport);
        result.stats.unmatchedCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Processing complete!`);
    console.log(`  Total: ${result.stats.totalReports}`);
    console.log(`  Mapped: ${result.stats.mappedCount}`);
    console.log(`  Unmatched: ${result.stats.unmatchedCount}`);
    console.log(`  Completed: ${result.stats.completedCount}`);
    console.log(`  Unknown type: ${result.stats.unknownTypeCount}`);
    console.log(`========================================\n`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-bulk-reports:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## Frontend Component

Create file: `src/pages/AdminBulkReportUpload.tsx`

```tsx
import { useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileWarning,
  Archive,
  Loader2,
  Brain,
  FileSearch,
  ShieldAlert
} from 'lucide-react';
import JSZip from 'jszip';

interface ReportFile {
  file: File;
  fileName: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  filePath?: string;
  error?: string;
}

interface MappedReport {
  documentId: string;
  fileName: string;
  reportType: 'similarity' | 'ai';
  percentage: number | null;
}

interface UnmatchedReport {
  fileName: string;
  documentName: string | null;
  reason: string;
}

interface ProcessingResult {
  success: boolean;
  mapped: MappedReport[];
  unmatched: UnmatchedReport[];
  completedDocuments: string[];
  stats: {
    totalReports: number;
    mappedCount: number;
    unmatchedCount: number;
    completedCount: number;
    unknownTypeCount: number;
  };
}

export default function AdminBulkReportUpload() {
  const { role } = useAuth();
  const [files, setFiles] = useState<ReportFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check access - admin always has access
  const hasAccess = role === 'admin' || role === 'staff';

  const extractZipFiles = async (zipFile: File): Promise<File[]> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    const pdfFiles: File[] = [];

    for (const [filename, file] of Object.entries(contents.files)) {
      if (!file.dir && filename.toLowerCase().endsWith('.pdf')) {
        const blob = await file.async('blob');
        const extractedFile = new File([blob], filename.split('/').pop() || filename, { type: 'application/pdf' });
        pdfFiles.push(extractedFile);
      }
    }

    return pdfFiles;
  };

  const processFiles = async (incomingFiles: FileList | File[]) => {
    const newFiles: ReportFile[] = [];

    for (const file of Array.from(incomingFiles)) {
      if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
        try {
          const extractedFiles = await extractZipFiles(file);
          for (const extractedFile of extractedFiles) {
            newFiles.push({
              file: extractedFile,
              fileName: extractedFile.name,
              status: 'pending',
            });
          }
          toast.success(`Extracted ${extractedFiles.length} PDF files from ${file.name}`);
        } catch (error) {
          console.error('Error extracting ZIP:', error);
          toast.error(`Failed to extract ${file.name}`);
        }
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        newFiles.push({
          file,
          fileName: file.name,
          status: 'pending',
        });
      } else {
        toast.error(`Unsupported file type: ${file.name}`);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  }, []);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the bulk upload feature.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setProcessingResult(null);
    setUploadProgress(0);
  };

  const uploadAndProcess = async () => {
    if (files.length === 0) {
      toast.error('No files to process');
      return;
    }

    setProcessing(true);
    setUploadProgress(0);
    setProcessingResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload reports');
        setProcessing(false);
        return;
      }

      const uploadedReports: { fileName: string; filePath: string }[] = [];
      const totalFiles = files.length;

      // Upload each file to storage
      for (let i = 0; i < files.length; i++) {
        const reportFile = files[i];
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' } : f
        ));

        const timestamp = Date.now();
        const sanitizedName = reportFile.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `bulk-reports/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, reportFile.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', error: uploadError.message } : f
          ));
          continue;
        }

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploaded', filePath } : f
        ));

        uploadedReports.push({
          fileName: reportFile.fileName,
          filePath,
        });

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 50));
      }

      if (uploadedReports.length === 0) {
        toast.error('No files were uploaded successfully');
        setProcessing(false);
        return;
      }

      // Call the edge function for PDF-based auto-mapping
      setUploadProgress(60);
      
      const { data, error } = await supabase.functions.invoke('process-bulk-reports', {
        body: { reports: uploadedReports },
      });

      if (error) {
        console.error('Processing error:', error);
        toast.error('Failed to process reports: ' + error.message);
        setProcessing(false);
        return;
      }

      setUploadProgress(100);
      setProcessingResult(data as ProcessingResult);

      const stats = data.stats;
      if (stats.completedCount > 0) {
        toast.success(`Successfully completed ${stats.completedCount} documents!`);
      }
      if (stats.mappedCount > 0) {
        toast.success(`Mapped ${stats.mappedCount} reports to documents`);
      }
      if (stats.unmatchedCount > 0) {
        toast.warning(`${stats.unmatchedCount} reports could not be matched`);
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred during processing');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const uploadedCount = files.filter(f => f.status === 'uploaded').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Bulk Report Upload</h1>
          <p className="text-muted-foreground">
            Upload PDF reports for automatic document matching using AI-powered content extraction
          </p>
        </div>

        {/* How It Works */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <FileSearch className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p><strong>Stage 1:</strong> Document name is extracted from filename</p>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p><strong>Stage 2:</strong> Report type (Similarity/AI) and percentage are extracted from PDF page 2</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p><strong>Matching:</strong> Reports are matched to documents by normalized name</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Reports
            </CardTitle>
            <CardDescription>
              Drag and drop PDF files or ZIP archives containing reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Archive className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop PDF files or ZIP archives here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                >
                  Select Files
                </Button>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    Files ({files.length})
                    {uploadedCount > 0 && <span className="text-muted-foreground ml-2">• {uploadedCount} uploaded</span>}
                    {errorCount > 0 && <span className="text-destructive ml-2">• {errorCount} failed</span>}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={clearAll} disabled={processing}>
                    Clear All
                  </Button>
                </div>
                
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <p className="text-sm font-medium truncate">{file.fileName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.status === 'pending' && (
                            <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          )}
                          {file.status === 'uploading' && (
                            <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Uploading</Badge>
                          )}
                          {file.status === 'uploaded' && (
                            <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Uploaded</Badge>
                          )}
                          {file.status === 'error' && (
                            <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
                          )}
                          {!processing && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Progress */}
                {processing && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Processing PDFs...</span>
                      <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-4 flex justify-end">
                  <Button onClick={uploadAndProcess} disabled={processing || pendingCount === 0} size="lg">
                    {processing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Upload & Auto-Map ({pendingCount} files)</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processing Results */}
        {processingResult && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>Summary of the PDF-based auto-mapping process</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{processingResult.stats.totalReports}</p>
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{processingResult.stats.mappedCount}</p>
                  <p className="text-sm text-muted-foreground">Mapped</p>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{processingResult.stats.completedCount}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{processingResult.stats.unmatchedCount}</p>
                  <p className="text-sm text-muted-foreground">Unmatched</p>
                </div>
                <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{processingResult.stats.unknownTypeCount}</p>
                  <p className="text-sm text-muted-foreground">Unknown Type</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Mapped Reports */}
              {processingResult.mapped.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Successfully Mapped ({processingResult.mapped.length})
                  </h4>
                  <ScrollArea className="h-[150px] border rounded-lg">
                    <div className="p-3 space-y-2">
                      {processingResult.mapped.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-500/5 rounded">
                          <span className="text-sm truncate flex-1">{item.fileName}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="ml-2">
                              {item.reportType === 'similarity' ? 'Similarity' : 'AI'} Report
                            </Badge>
                            {item.percentage !== null && (
                              <Badge variant="secondary">{item.percentage}%</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Unmatched Reports */}
              {processingResult.unmatched.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-yellow-600" />
                    Unmatched / Flagged for Review ({processingResult.unmatched.length})
                  </h4>
                  <ScrollArea className="h-[150px] border rounded-lg">
                    <div className="p-3 space-y-2">
                      {processingResult.unmatched.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-yellow-500/5 rounded">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate font-medium">{item.fileName}</p>
                            <p className="text-xs text-destructive">{item.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
```

---

## Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```

---

## Configuration

### Supabase Config (supabase/config.toml)

```toml
[functions.process-bulk-reports]
verify_jwt = true
```

---

## Usage

1. Navigate to `/admin/bulk-report-upload`
2. Drag & drop PDF reports or ZIP files
3. Click "Upload & Auto-Map"
4. View results showing mapped and unmatched reports
5. Check unmatched reports in `/admin/unmatched-reports` for manual review

---

## Customization

### Modifying Report Detection Patterns

Edit the `classifyReportFromContent` function in the edge function to match your PDF report format:

```typescript
// Add your own indicators
const similarityIndicators = [
  'overall similarity',
  'your custom text here',
];

// Modify percentage extraction regex
const simPattern = /(\d{1,3})\s*%\s*your\s*pattern/i;
```

### Modifying Filename Normalization

Edit the `extractDocumentKey` function to match your naming conventions.

---

## License

MIT - Use freely in your projects.
