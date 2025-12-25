import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs";

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
}

interface GroupedReports {
  documentKey: string;
  matchedDocument: DocumentRecord | null;
  reports: {
    fileName: string;
    filePath: string;
    pdfData: Uint8Array;
  }[];
}

/**
 * Extract text from a specific page of a PDF
 */
async function extractTextFromPage(pdfData: Uint8Array, pageNumber: number): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    if (pageNumber > pdf.numPages) {
      return '';
    }
    
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    const text = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ');
    
    return text;
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    return '';
  }
}

/**
 * STAGE 1: Extract document key from report filename.
 * 
 * Pattern: Extract base name in format "fileA (X)" from report filename.
 * 
 * Examples:
 * - "fileA (1).pdf" -> "fileA (1)"
 * - "fileA (1) (1).pdf" -> "fileA (1)" (removes trailing bracket for matching)
 * - "fileA (2) (2).pdf" -> "fileA (2)"
 */
function extractDocumentKeyFromFilename(reportFileName: string): string | null {
  if (!reportFileName) return null;
  
  // Remove .pdf extension
  let baseName = reportFileName.replace(/\.pdf$/i, '').trim();
  
  // Pattern: Look for "name (X)" or "name (X) (Y)" pattern
  // If there's a trailing bracket number, remove it to get the document key
  // e.g., "fileA (1) (1)" -> "fileA (1)"
  // e.g., "fileA (2) (2)" -> "fileA (2)"
  
  const trailingBracketPattern = /^(.+\s*\(\d+\))\s*\(\d+\)$/;
  const match = baseName.match(trailingBracketPattern);
  
  if (match) {
    // Has trailing bracket - return the base without it
    return match[1].trim();
  }
  
  // Check if it matches "name (X)" pattern directly
  const directPattern = /^(.+\s*\(\d+\))$/;
  const directMatch = baseName.match(directPattern);
  
  if (directMatch) {
    return directMatch[1].trim();
  }
  
  // Fallback: return the base name as-is
  return baseName;
}

/**
 * Get expected report filenames based on document's original_file_name and is_pdf_original.
 * 
 * If is_pdf_original = false:
 *   - Report 1: fileA (X).pdf
 *   - Report 2: fileA (X) (1).pdf
 * 
 * If is_pdf_original = true:
 *   - Report 1: fileA (X) (1).pdf
 *   - Report 2: fileA (X) (2).pdf
 */
function getExpectedReportNames(originalFileName: string, isPdfOriginal: boolean): { report1: string; report2: string } {
  const baseName = originalFileName.trim();
  
  if (isPdfOriginal) {
    return {
      report1: `${baseName} (1)`,
      report2: `${baseName} (2)`,
    };
  } else {
    return {
      report1: baseName,
      report2: `${baseName} (1)`,
    };
  }
}

/**
 * STAGE 1: Find matching document based on report filename using naming conventions.
 * This does NOT determine report type - just groups by document key.
 */
function findDocumentByNaming(reportFileName: string, documents: DocumentRecord[]): { doc: DocumentRecord | null; documentKey: string | null } {
  const documentKey = extractDocumentKeyFromFilename(reportFileName);
  
  if (!documentKey) {
    return { doc: null, documentKey: null };
  }
  
  const normalizedKey = documentKey.toLowerCase().trim();
  
  for (const doc of documents) {
    if (!doc.original_file_name) continue;
    
    const isPdfOriginal = doc.is_pdf_original === true;
    const expectedNames = getExpectedReportNames(doc.original_file_name, isPdfOriginal);
    
    // Normalize for comparison
    const normalizedOriginal = doc.original_file_name.toLowerCase().trim();
    const normalizedReport1 = expectedNames.report1.toLowerCase().trim();
    const normalizedReport2 = expectedNames.report2.toLowerCase().trim();
    
    // Remove .pdf extension from report filename for comparison
    const reportBaseName = reportFileName.replace(/\.pdf$/i, '').toLowerCase().trim();
    
    // Check if report filename matches any expected pattern for this document
    if (reportBaseName === normalizedReport1 || 
        reportBaseName === normalizedReport2 ||
        reportBaseName === normalizedOriginal) {
      console.log(`Matched report "${reportFileName}" to document "${doc.original_file_name}" (id: ${doc.id})`);
      return { doc, documentKey: doc.original_file_name };
    }
    
    // Also check if document key matches original_file_name
    if (normalizedKey === normalizedOriginal) {
      console.log(`Matched by document key "${documentKey}" to document "${doc.original_file_name}" (id: ${doc.id})`);
      return { doc, documentKey: doc.original_file_name };
    }
  }
  
  return { doc: null, documentKey };
}

/**
 * STAGE 2: Classify report type and extract percentage from page 2 PDF content.
 * 
 * - "overall similarity" -> Similarity Report, extract X% overall similarity
 * - "detected as ai" -> AI Report, extract X% detected as ai
 */
function classifyReportFromContent(page2Text: string): { reportType: 'similarity' | 'ai' | 'unknown'; percentage: number | null } {
  if (!page2Text || page2Text.trim().length === 0) {
    return { reportType: 'unknown', percentage: null };
  }
  
  const lowerText = page2Text.toLowerCase();
  
  // Check for Similarity report: "overall similarity"
  if (lowerText.includes('overall similarity')) {
    const simPattern = /(\d{1,3})%\s*overall\s*similarity/i;
    const simMatch = page2Text.match(simPattern);
    const percentage = simMatch ? parseInt(simMatch[1], 10) : null;
    
    return { 
      reportType: 'similarity', 
      percentage: percentage !== null && percentage >= 0 && percentage <= 100 ? percentage : null 
    };
  }
  
  // Check for AI detection report: "detected as ai"
  if (lowerText.includes('detected as ai')) {
    const aiPattern = /(\d{1,3})%\s*detected\s*as\s*ai/i;
    const aiMatch = page2Text.match(aiPattern);
    const percentage = aiMatch ? parseInt(aiMatch[1], 10) : null;
    
    return { 
      reportType: 'ai', 
      percentage: percentage !== null && percentage >= 0 && percentage <= 100 ? percentage : null 
    };
  }
  
  return { reportType: 'unknown', percentage: null };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify staff/admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user role
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

    console.log(`Processing ${reports.length} reports with two-stage logic`);

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

    // Process each report with two-stage logic
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
        // =====================================
        // STAGE 1: Group by naming convention
        // =====================================
        console.log('Stage 1: Matching by filename pattern...');
        const { doc: matchedDoc, documentKey } = findDocumentByNaming(report.fileName, documents || []);
        processedReport.documentKey = documentKey;

        if (!matchedDoc) {
          console.log(`Stage 1 failed: No document found for key "${documentKey}"`);
          processedReport.error = 'No matching document found by filename';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: documentKey || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey, 
            reason: 'No matching document found by filename pattern' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        processedReport.matchedDocumentId = matchedDoc.id;
        console.log(`Stage 1 success: Matched to document ${matchedDoc.id} (${matchedDoc.original_file_name})`);

        // =====================================
        // STAGE 2: Classify by PDF content
        // =====================================
        console.log('Stage 2: Classifying report type from PDF content...');
        
        // Download the PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('reports')
          .download(report.filePath);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${report.fileName}:`, downloadError);
          processedReport.error = 'Failed to download file for classification';
          result.processed.push(processedReport);
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey, 
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
        console.log(`Page 2 text (first 300 chars): ${page2Text.substring(0, 300)}`);
        
        const { reportType, percentage } = classifyReportFromContent(page2Text);
        processedReport.reportType = reportType;
        processedReport.percentage = percentage;
        console.log(`Stage 2 result: type=${reportType}, percentage=${percentage}`);

        if (reportType === 'unknown') {
          result.stats.unknownTypeCount++;
          processedReport.error = 'Could not determine report type from PDF content';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: documentKey || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            matched_document_id: matchedDoc.id,
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentKey, 
            reason: 'Could not determine report type from PDF content' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // =====================================
        // UPDATE DATABASE
        // =====================================
        // Prepare update data based on report type - ONLY update the relevant fields
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
          console.log(`Updating similarity report for document ${matchedDoc.id}`);
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
          console.log(`Updating AI report for document ${matchedDoc.id}`);
        }

        // Check if both reports will be present after this update
        const willHaveSimilarity = reportType === 'similarity' || matchedDoc.similarity_report_path;
        const willHaveAi = reportType === 'ai' || matchedDoc.ai_report_path;
        
        if (willHaveSimilarity && willHaveAi) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
          result.completedDocuments.push(matchedDoc.id);
          result.stats.completedCount++;
          console.log(`Document ${matchedDoc.id} will be marked as completed`);
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

        result.mapped.push({
          documentId: matchedDoc.id,
          fileName: report.fileName,
          reportType,
          percentage,
        });
        result.stats.mappedCount++;
        result.processed.push(processedReport);
        console.log(`Successfully mapped ${report.fileName} to document ${matchedDoc.id} as ${reportType} report`);

      } catch (error) {
        console.error(`Error processing ${report.fileName}:`, error);
        processedReport.error = error instanceof Error ? error.message : 'Unknown error';
        result.processed.push(processedReport);
        result.stats.unmatchedCount++;
      }
    }

    // Send notifications for completed documents
    for (const docId of result.completedDocuments) {
      const { data: completedDoc } = await supabase
        .from('documents')
        .select('id, file_name, user_id')
        .eq('id', docId)
        .single();

      if (completedDoc?.user_id) {
        // Create user notification
        await supabase.from('user_notifications').insert({
          user_id: completedDoc.user_id,
          title: 'Document Completed',
          message: `Your document "${completedDoc.file_name}" has been processed and is ready for download.`,
          created_by: user.id,
        });

        // Trigger push notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: completedDoc.user_id,
              title: 'Document Completed',
              body: `Your document "${completedDoc.file_name}" is ready!`,
              url: '/my-documents',
            }),
          });
        } catch (pushError) {
          console.error('Failed to send push notification:', pushError);
        }

        // Trigger completion email
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              documentId: docId,
              userId: completedDoc.user_id,
              fileName: completedDoc.file_name,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send completion email:', emailError);
        }
      }
    }

    console.log('\n=== Bulk report processing complete ===');
    console.log('Stats:', result.stats);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-bulk-reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
