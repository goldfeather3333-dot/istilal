import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportFile {
  fileName: string;
  filePath: string;
  normalizedFilename: string;
}

interface MappingResult {
  documentId: string;
  fileName: string;
  reportType: 'similarity' | 'ai';
  success: boolean;
  message?: string;
}

interface ProcessingResult {
  success: boolean;
  mapped: MappingResult[];
  unmatched: ReportFile[];
  needsReview: { documentId: string; reason: string }[];
  completedDocuments: string[];
  stats: {
    totalReports: number;
    mappedCount: number;
    unmatchedCount: number;
    completedCount: number;
    needsReviewCount: number;
  };
}

/**
 * Get the base name from a customer document filename (just removes extension).
 * Examples:
 *   fileA1.pdf → fileA1
 *   fileA1 (1).pdf → fileA1 (1)
 *   fileA1 (1).doc → fileA1 (1)
 */
function getDocumentBaseName(filename: string): string {
  let result = filename.toLowerCase();
  // Remove file extension only
  result = result.replace(/\.[^.]+$/, '');
  return result.trim();
}

/**
 * Check if a filename has a PDF extension.
 */
function isPdfFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

/**
 * Extract the bracket number from a filename (e.g., "fileA (3)" → 3).
 * Returns null if no bracket number is found.
 */
function extractBracketNumber(baseName: string): number | null {
  const match = baseName.match(/\s*\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the base name without the trailing bracket number.
 * Examples:
 *   fileA1 (1) → fileA1
 *   fileA1 (2) → fileA1
 *   fileA1 → fileA1
 */
function getBaseWithoutTrailingBracket(baseName: string): string {
  return baseName.replace(/\s*\(\d+\)$/, '').trim();
}

/**
 * Determine expected report patterns for a customer document.
 * 
 * UNIVERSAL RULE:
 * - For NON-PDF files (doc, docx, txt, rtf, etc.) with pattern "fileA (X).ext":
 *   - Similarity report: "fileA (X).pdf" (exact base name + .pdf)
 *   - AI report: "fileA (X) (1).pdf" (base name + (1) + .pdf)
 * 
 * - For PDF files with pattern "fileA (X).pdf":
 *   - Similarity report: "fileA (X) (1).pdf"
 *   - AI report: "fileA (X) (2).pdf"
 * 
 * Returns the expected report base names for similarity and AI reports.
 */
function getExpectedReportBaseNames(docFileName: string): { similarity: string; ai: string } {
  const baseName = getDocumentBaseName(docFileName);
  const isPdf = isPdfFile(docFileName);
  
  if (isPdf) {
    // PDF logic: reports have (1) and (2) appended
    // fileA (X).pdf → similarity: fileA (X) (1), ai: fileA (X) (2)
    return {
      similarity: `${baseName} (1)`,
      ai: `${baseName} (2)`,
    };
  } else {
    // Non-PDF logic: similarity has same base name, AI has (1) appended
    // fileA (X).doc → similarity: fileA (X), ai: fileA (X) (1)
    return {
      similarity: baseName,
      ai: `${baseName} (1)`,
    };
  }
}

/**
 * Get the base name from a report filename (removes extension only).
 */
function getReportBaseName(filename: string): string {
  let result = filename.toLowerCase();
  // Remove file extension
  result = result.replace(/\.[^.]+$/, '');
  return result.trim();
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

    console.log(`Processing ${reports.length} reports for auto-mapping`);

    // Fetch all pending and in_progress documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, normalized_filename, user_id, similarity_report_path, ai_report_path, status, needs_review')
      .in('status', ['pending', 'in_progress'])
      .eq('needs_review', false);

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw new Error('Failed to fetch documents');
    }

    console.log(`Found ${documents?.length || 0} pending/in_progress documents`);

    // Create a map of report base names to report files
    const reportsByBaseName = new Map<string, ReportFile[]>();
    for (const report of reports) {
      const reportBaseName = getReportBaseName(report.fileName);
      report.normalizedFilename = reportBaseName;
      
      if (!reportsByBaseName.has(reportBaseName)) {
        reportsByBaseName.set(reportBaseName, []);
      }
      reportsByBaseName.get(reportBaseName)!.push(report);
    }

    console.log(`Report base names:`, Array.from(reportsByBaseName.keys()));

    const result: ProcessingResult = {
      success: true,
      mapped: [],
      unmatched: [],
      needsReview: [],
      completedDocuments: [],
      stats: {
        totalReports: reports.length,
        mappedCount: 0,
        unmatchedCount: 0,
        completedCount: 0,
        needsReviewCount: 0,
      },
    };

    // Track which reports have been matched
    const matchedReportPaths = new Set<string>();

    // Process each document and try to find matching reports
    for (const doc of documents || []) {
      const docBaseName = getDocumentBaseName(doc.file_name);
      const expected = getExpectedReportBaseNames(doc.file_name);
      
      console.log(`Processing document "${doc.file_name}" (base: ${docBaseName})`);
      console.log(`  Expected similarity report base: "${expected.similarity}"`);
      console.log(`  Expected AI report base: "${expected.ai}"`);

      // Find matching similarity report
      const similarityReports = reportsByBaseName.get(expected.similarity) || [];
      // Find matching AI report
      const aiReports = reportsByBaseName.get(expected.ai) || [];

      console.log(`  Found ${similarityReports.length} potential similarity reports, ${aiReports.length} potential AI reports`);

      // Filter out already matched reports
      const availableSimilarityReports = similarityReports.filter(r => !matchedReportPaths.has(r.filePath));
      const availableAiReports = aiReports.filter(r => !matchedReportPaths.has(r.filePath));

      // Check for ambiguous matches
      if (availableSimilarityReports.length > 1 || availableAiReports.length > 1) {
        console.log(`  Ambiguous match - flagging for review`);
        await supabase
          .from('documents')
          .update({
            needs_review: true,
            review_reason: `Multiple possible report matches found (${availableSimilarityReports.length} similarity, ${availableAiReports.length} AI)`,
          })
          .eq('id', doc.id);

        result.needsReview.push({
          documentId: doc.id,
          reason: `Multiple possible report matches`,
        });
        continue;
      }

      let updatedDoc = { ...doc };
      let hasUpdate = false;

      // Map similarity report
      if (availableSimilarityReports.length === 1 && !doc.similarity_report_path) {
        const report = availableSimilarityReports[0];
        updatedDoc.similarity_report_path = report.filePath;
        matchedReportPaths.add(report.filePath);
        hasUpdate = true;

        result.mapped.push({
          documentId: doc.id,
          fileName: report.fileName,
          reportType: 'similarity',
          success: true,
        });
        result.stats.mappedCount++;
        console.log(`  Mapped similarity report: ${report.fileName}`);
      }

      // Map AI report
      if (availableAiReports.length === 1 && !doc.ai_report_path) {
        const report = availableAiReports[0];
        updatedDoc.ai_report_path = report.filePath;
        matchedReportPaths.add(report.filePath);
        hasUpdate = true;

        result.mapped.push({
          documentId: doc.id,
          fileName: report.fileName,
          reportType: 'ai',
          success: true,
        });
        result.stats.mappedCount++;
        console.log(`  Mapped AI report: ${report.fileName}`);
      }

      // Update the document if we made changes
      if (hasUpdate) {
        const updateData: Record<string, unknown> = {};
        
        if (updatedDoc.similarity_report_path !== doc.similarity_report_path) {
          updateData.similarity_report_path = updatedDoc.similarity_report_path;
        }
        if (updatedDoc.ai_report_path !== doc.ai_report_path) {
          updateData.ai_report_path = updatedDoc.ai_report_path;
        }

        // Check if both reports are now attached - mark as completed
        if (updatedDoc.similarity_report_path && updatedDoc.ai_report_path) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
          result.completedDocuments.push(doc.id);
          result.stats.completedCount++;
          console.log(`  Document ${doc.id} completed with both reports`);
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', doc.id);

          if (updateError) {
            console.error(`Error updating document ${doc.id}:`, updateError);
          }
        }
      }
    }

    // Find all unmatched reports (those not in matchedReportPaths)
    for (const report of reports) {
      if (!matchedReportPaths.has(report.filePath)) {
        result.unmatched.push(report);
        
        // Store in unmatched_reports table
        await supabase.from('unmatched_reports').insert({
          file_name: report.fileName,
          normalized_filename: report.normalizedFilename,
          file_path: report.filePath,
          uploaded_by: user.id,
        });
      }
    }

    // Calculate final stats
    result.stats.unmatchedCount = result.unmatched.length;
    result.stats.needsReviewCount = result.needsReview.length;

    // Send notifications for completed documents
    for (const docId of result.completedDocuments) {
      // Get document details for notification
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
    console.error('Error in bulk-report-upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
