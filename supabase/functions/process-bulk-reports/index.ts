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
 * - "SWOT,TOWS,AHP ASSIGNMENT(1).pdf" → "swot,tows,ahp assignment"
 */
function extractDocumentKey(filename: string): string {
  if (!filename) return '';
  
  let key = filename;
  
  // Step 1: Remove file extension
  key = key.replace(/\.[^.]+$/, '');
  
  // Step 2: Remove trailing numbers in round brackets (can be multiple)
  // Pattern matches (1), (2), (45), etc. at the end or with trailing spaces
  key = key.replace(/\s*\(\d+\)\s*$/g, '');
  // Handle cases like "file(1)" without space
  key = key.replace(/\(\d+\)$/g, '');
  
  // Step 3: Trim extra spaces
  key = key.trim();
  
  // Step 4: Remove surrounding brackets if the entire name is wrapped
  // Handle () wrapping
  if (key.startsWith('(') && key.endsWith(')')) {
    key = key.slice(1, -1);
  }
  // Handle [] wrapping - but also handle [Guest] prefix patterns
  if (key.startsWith('[') && key.endsWith(']')) {
    key = key.slice(1, -1);
  }
  
  // Handle [Guest] prefix pattern - remove [text] at start
  key = key.replace(/^\[.*?\]\s*/g, '');
  
  // Step 5: Normalize - lowercase and collapse multiple spaces
  key = key.toLowerCase();
  key = key.replace(/\s+/g, ' ');
  key = key.trim();
  
  return key;
}

/**
 * Extract text from a specific page of a PDF
 */
async function extractTextFromPage(pdfData: Uint8Array, pageNumber: number): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    if (pageNumber > pdf.numPages) {
      console.log(`Page ${pageNumber} does not exist (PDF has ${pdf.numPages} pages)`);
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
  
  // Normalize text for detection
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
    // Extract percentage: X% overall similarity
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
    return { 
      reportType: 'similarity', 
      percentage,
      confidence: 'high'
    };
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
    // Extract percentage: X% detected as ai
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
    return { 
      reportType: 'ai', 
      percentage,
      confidence: 'high'
    };
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
    
    // Pre-compute document keys for all documents
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
        // =====================================
        // STAGE 1: DOCUMENT GROUPING
        // =====================================
        console.log('Stage 1: Extracting document key from report filename...');
        
        const reportKey = extractDocumentKey(report.fileName);
        processedReport.documentKey = reportKey;
        console.log(`  Report key: "${reportKey}"`);

        // Find matching document by comparing document keys
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

        // =====================================
        // STAGE 2: REPORT CLASSIFICATION
        // =====================================
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
        console.log(`  Page 2 preview: "${page2Text.substring(0, 200).replace(/\n/g, ' ')}..."`);
        
        const { reportType, percentage, confidence } = classifyReportFromContent(page2Text);
        processedReport.reportType = reportType;
        processedReport.percentage = percentage;
        console.log(`Stage 2 result: type=${reportType}, percentage=${percentage}, confidence=${confidence}`);

        if (reportType === 'unknown') {
          result.stats.unknownTypeCount++;
          processedReport.error = 'Could not determine report type from PDF content';
          result.processed.push(processedReport);
          
          // Store in unmatched_reports for manual review with matched document ID
          await supabase.from('unmatched_reports').insert({
            file_name: report.fileName,
            normalized_filename: reportKey || report.fileName,
            file_path: report.filePath,
            report_type: 'unknown',
            matched_document_id: matchedDoc.id,
            uploaded_by: user.id,
          });
          
          // Update document to flag for manual review
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

        // =====================================
        // DATABASE UPDATE
        // =====================================
        console.log('Updating database...');
        
        // Prepare update data - ONLY update the relevant fields
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
          console.log(`  Setting similarity_report_path and similarity_percentage=${percentage}`);
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
          console.log(`  Setting ai_report_path and ai_percentage=${percentage}`);
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

            // Send push notification
            await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: matchedDoc.user_id,
                title: 'Document Ready',
                body: `Your document "${matchedDoc.file_name}" is ready for download.`,
                eventType: 'document_completed',
              },
            });

            // Send completion email
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
