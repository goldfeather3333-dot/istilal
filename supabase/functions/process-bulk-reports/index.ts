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
  documentName: string | null;
  reportType: 'similarity' | 'ai' | 'unknown';
  percentage: number | null;
  matchedDocumentId: string | null;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  processed: ProcessedReport[];
  mapped: { documentId: string; fileName: string; reportType: string; percentage: number | null }[];
  unmatched: { fileName: string; documentName: string | null; reason: string }[];
  completedDocuments: string[];
  stats: {
    totalReports: number;
    mappedCount: number;
    unmatchedCount: number;
    completedCount: number;
    unknownTypeCount: number;
  };
}

/**
 * Extract text from a specific page of a PDF
 */
async function extractTextFromPage(pdfData: Uint8Array, pageNumber: number): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    if (pageNumber > pdf.numPages) {
      return '';
    }
    
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Combine all text items
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
 * Extract document name from page 1 text.
 * The document name is typically displayed on the cover page.
 * We look for common patterns and extract the most likely document name.
 */
function extractDocumentName(page1Text: string): string | null {
  if (!page1Text || page1Text.trim().length === 0) {
    return null;
  }
  
  // Clean and normalize the text
  const cleanText = page1Text.trim();
  
  // Common patterns for document names on cover pages
  // Pattern 1: "Document: filename" or "File: filename"
  const docPattern = /(?:document|file|name|title)\s*:\s*([^\n\r]+)/i;
  const docMatch = cleanText.match(docPattern);
  if (docMatch && docMatch[1]) {
    return normalizeDocumentName(docMatch[1].trim());
  }
  
  // Pattern 2: Look for filename patterns (words with extensions or brackets)
  const filenamePattern = /([a-zA-Z0-9_\-\s]+(?:\s*\(\d+\))?(?:\.[a-zA-Z0-9]+)?)/g;
  const matches = cleanText.match(filenamePattern);
  
  if (matches && matches.length > 0) {
    // Filter to find the most likely document name
    // Prefer longer names that look like filenames
    const candidates = matches
      .map(m => m.trim())
      .filter(m => m.length >= 3 && m.length <= 100)
      .filter(m => !/^(page|similarity|ai|detection|report|overall|detected|turnitin|originality)/i.test(m));
    
    if (candidates.length > 0) {
      // Return the first substantial candidate
      return normalizeDocumentName(candidates[0]);
    }
  }
  
  // Pattern 3: Take the first substantial line that looks like a name
  const lines = cleanText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    // Skip common header/footer text
    if (/^(similarity|ai|detection|report|overall|page|\d+%)/i.test(line)) continue;
    if (line.length >= 3 && line.length <= 100) {
      return normalizeDocumentName(line);
    }
  }
  
  return null;
}

/**
 * Normalize a document name for matching purposes.
 * Removes extensions and converts to lowercase.
 */
function normalizeDocumentName(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Remove file extension if present
  normalized = normalized.replace(/\.[a-zA-Z0-9]+$/, '');
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

/**
 * Classify report type and extract percentage from page 2 text.
 */
function classifyAndExtractPercentage(page2Text: string): { reportType: 'similarity' | 'ai' | 'unknown'; percentage: number | null } {
  if (!page2Text || page2Text.trim().length === 0) {
    return { reportType: 'unknown', percentage: null };
  }
  
  const lowerText = page2Text.toLowerCase();
  
  // Check for AI detection report: "detected as ai"
  if (lowerText.includes('detected as ai')) {
    // Extract percentage: "X% detected as ai"
    const aiPattern = /(\d{1,3})%\s*detected\s*as\s*ai/i;
    const aiMatch = page2Text.match(aiPattern);
    const percentage = aiMatch ? parseInt(aiMatch[1], 10) : null;
    
    return { 
      reportType: 'ai', 
      percentage: percentage !== null && percentage >= 0 && percentage <= 100 ? percentage : null 
    };
  }
  
  // Check for Similarity report: "overall similarity"
  if (lowerText.includes('overall similarity')) {
    // Extract percentage: "X% overall similarity"
    const simPattern = /(\d{1,3})%\s*overall\s*similarity/i;
    const simMatch = page2Text.match(simPattern);
    const percentage = simMatch ? parseInt(simMatch[1], 10) : null;
    
    return { 
      reportType: 'similarity', 
      percentage: percentage !== null && percentage >= 0 && percentage <= 100 ? percentage : null 
    };
  }
  
  return { reportType: 'unknown', percentage: null };
}

serve(async (req: Request) => {
  // Handle CORS preflight
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

    console.log(`Processing ${reports.length} reports with PDF text extraction`);

    // Fetch all pending and in_progress documents for matching
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, normalized_filename, user_id, similarity_report_path, ai_report_path, similarity_percentage, ai_percentage, status, needs_review')
      .in('status', ['pending', 'in_progress']);

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw new Error('Failed to fetch documents');
    }

    console.log(`Found ${documents?.length || 0} pending/in_progress documents`);

    // Create a map for faster document lookup by normalized name
    const documentsByNormalizedName = new Map<string, typeof documents[number][]>();
    for (const doc of documents || []) {
      const normalizedName = doc.normalized_filename || normalizeDocumentName(doc.file_name);
      if (!documentsByNormalizedName.has(normalizedName)) {
        documentsByNormalizedName.set(normalizedName, []);
      }
      documentsByNormalizedName.get(normalizedName)!.push(doc);
    }

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
      console.log(`Processing report: ${report.fileName}`);
      
      const processedReport: ProcessedReport = {
        fileName: report.fileName,
        filePath: report.filePath,
        documentName: null,
        reportType: 'unknown',
        percentage: null,
        matchedDocumentId: null,
      };

      try {
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
            documentName: null, 
            reason: 'Failed to download file' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // Convert to Uint8Array
        const arrayBuffer = await fileData.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        // Extract text from page 1 (document name)
        const page1Text = await extractTextFromPage(pdfData, 1);
        console.log(`Page 1 text (first 200 chars): ${page1Text.substring(0, 200)}`);
        
        const documentName = extractDocumentName(page1Text);
        processedReport.documentName = documentName;
        console.log(`Extracted document name: ${documentName}`);

        // Extract text from page 2 (report type and percentage)
        const page2Text = await extractTextFromPage(pdfData, 2);
        console.log(`Page 2 text (first 200 chars): ${page2Text.substring(0, 200)}`);
        
        const { reportType, percentage } = classifyAndExtractPercentage(page2Text);
        processedReport.reportType = reportType;
        processedReport.percentage = percentage;
        console.log(`Classified as: ${reportType}, percentage: ${percentage}`);

        if (reportType === 'unknown') {
          result.stats.unknownTypeCount++;
          processedReport.error = 'Could not determine report type';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: documentName || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentName, 
            reason: 'Could not determine report type' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        if (!documentName) {
          processedReport.error = 'Could not extract document name from page 1';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: report.fileName,
            file_path: report.filePath,
            report_type: reportType,
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentName: null, 
            reason: 'Could not extract document name' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // Find matching document
        const matchingDocs = documentsByNormalizedName.get(documentName) || [];
        
        // Also try partial matching for documents that might have slight variations
        let candidateDocs = [...matchingDocs];
        if (candidateDocs.length === 0) {
          // Try to find documents with similar names
          for (const [normalizedName, docs] of documentsByNormalizedName) {
            if (normalizedName.includes(documentName) || documentName.includes(normalizedName)) {
              candidateDocs.push(...docs);
            }
          }
        }

        if (candidateDocs.length === 0) {
          processedReport.error = 'No matching document found';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: documentName,
            file_path: report.filePath,
            report_type: reportType,
            uploaded_by: user.id,
          });
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentName, 
            reason: 'No matching document found' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        if (candidateDocs.length > 1) {
          // Multiple matches - flag for manual review
          processedReport.error = 'Multiple matching documents found';
          result.processed.push(processedReport);
          
          // Flag all candidate documents for review
          for (const doc of candidateDocs) {
            await supabase
              .from('documents')
              .update({
                needs_review: true,
                review_reason: `Multiple documents match report "${report.fileName}"`,
              })
              .eq('id', doc.id);
          }
          
          result.unmatched.push({ 
            fileName: report.fileName, 
            documentName, 
            reason: 'Multiple matching documents found' 
          });
          result.stats.unmatchedCount++;
          continue;
        }

        // Single match found
        const matchedDoc = candidateDocs[0];
        processedReport.matchedDocumentId = matchedDoc.id;

        // Prepare update data based on report type
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

        result.mapped.push({
          documentId: matchedDoc.id,
          fileName: report.fileName,
          reportType,
          percentage,
        });
        result.stats.mappedCount++;
        result.processed.push(processedReport);
        console.log(`Successfully mapped ${report.fileName} to document ${matchedDoc.id}`);

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

    console.log('Bulk report processing complete:', result.stats);

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
