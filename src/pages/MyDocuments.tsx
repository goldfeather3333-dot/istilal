import React, { useState, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDocuments, Document } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { DocumentSearchFilters, DocumentFilters, filterDocuments } from '@/components/DocumentSearchFilters';
import { DocumentTagManager } from '@/components/DocumentTagManager';
import { FileText, Download, Loader2, Star, StarOff, DownloadCloud, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MyDocuments() {
  const { documents, loading, downloadFile, deleteDocument, fetchDocuments } = useDocuments();
  const { role } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isStaffOrAdmin = role === 'staff' || role === 'admin';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined
  });

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await fetchDocuments();
      toast({ title: 'Documents refreshed' });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({ title: 'Failed to refresh', variant: 'destructive' });
    }
  }, [fetchDocuments, toast]);

  const { containerRef, pullDistance, progress, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  const filteredDocuments = useMemo(() => {
    return filterDocuments(documents, filters);
  }, [documents, filters]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const toggleFavorite = async (doc: Document) => {
    const newValue = !doc.is_favorite;
    await supabase
      .from('documents')
      .update({ is_favorite: newValue })
      .eq('id', doc.id);
    
    toast({
      title: newValue ? 'Added to favorites' : 'Removed from favorites',
      description: doc.file_name,
    });
  };

  const toggleSelection = (docId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const completedDocs = filteredDocuments.filter(d => d.status === 'completed');
    setSelectedIds(new Set(completedDocs.map(d => d.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDownload = async () => {
    const selectedDocs = filteredDocuments.filter(d => selectedIds.has(d.id) && d.status === 'completed');
    if (selectedDocs.length === 0) {
      toast({ title: 'No completed documents selected', variant: 'destructive' });
      return;
    }

    // Build list of report files to download
    const files: Array<{ path: string; name: string }> = [];
    for (const doc of selectedDocs) {
      const baseName = doc.file_name.replace(/\.[^/.]+$/, '');
      if (doc.similarity_report_path) files.push({ path: doc.similarity_report_path, name: `${baseName}_similarity.pdf` });
      if (doc.ai_report_path) files.push({ path: doc.ai_report_path, name: `${baseName}_ai.pdf` });
    }

    if (files.length === 0) {
      toast({ title: 'No reports found for selected documents', variant: 'destructive' });
      return;
    }

    setBulkDownloading(true);
    try {
      toast({ title: 'Preparing ZIP…', description: `Collecting ${files.length} file(s)` });

      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];

        const { data, error } = await supabase.storage
          .from('reports')
          .createSignedUrl(f.path, 300);

        if (error) throw error;

        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${f.name} (${res.status})`);

        const buf = await res.arrayBuffer();
        zip.file(f.name, buf);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `reports_${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(zipBlob);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast({ title: 'Opened ZIP', description: 'Use Share → Save to Files to download on iPhone/iPad.' });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        a.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 2000);
        toast({ title: 'Download started', description: zipName });
      }

      setSelectedIds(new Set());
    } catch (e) {
      console.error('Bulk ZIP download failed:', e);
      toast({ title: 'Download failed', description: 'Could not prepare the ZIP file.', variant: 'destructive' });
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;
    
    setDeleting(true);
    const success = await deleteDocument(documentToDelete.id, documentToDelete);
    setDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const completedCount = filteredDocuments.filter(d => d.status === 'completed').length;
  const selectedCompletedCount = filteredDocuments.filter(d => selectedIds.has(d.id) && d.status === 'completed').length;

  return (
    <DashboardLayout>
      <div 
        ref={isMobile ? containerRef : undefined}
        className="relative"
        style={{
          transform: isMobile && pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: !isRefreshing && pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {/* Pull to Refresh Indicator - Mobile Only */}
        {isMobile && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            progress={progress}
            isRefreshing={isRefreshing}
          />
        )}
        
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">My Documents</h1>
            <p className="text-muted-foreground mt-1">
              View all your uploaded documents and their status
            </p>
          </div>
          
          {/* Bulk actions */}
          {completedCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedIds.size === completedCount}
              >
                <Package className="h-4 w-4 mr-1" />
                Select All ({completedCount})
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkDownload}
                    disabled={bulkDownloading}
                  >
                    {bulkDownloading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <DownloadCloud className="h-4 w-4 mr-1" />
                    )}
                    Download Reports ({selectedCompletedCount})
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Filters */}
        <DocumentSearchFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          showStatusFilter={true}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0 ? 'Upload your first document to get started' : 'Try adjusting your filters'}
              </p>
              {documents.length === 0 && (
                <Button asChild>
                  <a href="/dashboard/upload">Upload Document</a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === completedCount && completedCount > 0}
                          onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                        />
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Upload Time</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Similarity %</TableHead>
                      <TableHead className="text-center">AI %</TableHead>
                      <TableHead className="text-center">Similarity Report</TableHead>
                      <TableHead className="text-center">AI Report</TableHead>
                      <TableHead>Remarks</TableHead>
                      {role === 'customer' && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc, index) => {
                      const { date, time } = formatDateTime(doc.uploaded_at);
                      const baseName = doc.file_name.replace(/\.[^/.]+$/, '');
                      const isSelected = selectedIds.has(doc.id);
                      const canSelect = doc.status === 'completed';
                      const canDelete = role === 'customer' && doc.status === 'completed';

                      return (
                        <TableRow key={doc.id} className={isSelected ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              disabled={!canSelect}
                              onCheckedChange={() => toggleSelection(doc.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleFavorite(doc)}
                            >
                              {doc.is_favorite ? (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              ) : (
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[200px]" title={doc.file_name}>
                                  {doc.file_name}
                                </span>
                                {isStaffOrAdmin && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={doc.customer_profile?.email}>
                                    {doc.customer_profile?.full_name || doc.customer_profile?.email || (doc.magic_link_id ? 'Guest' : '-')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DocumentTagManager documentId={doc.id} compact />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{date}</div>
                              <div className="text-muted-foreground">{time}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={doc.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            {doc.similarity_percentage !== null && doc.similarity_percentage !== undefined ? (
                              <span className="font-medium text-orange-600">{doc.similarity_percentage}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {doc.ai_percentage !== null && doc.ai_percentage !== undefined ? (
                              <span className="font-medium text-blue-600">{doc.ai_percentage}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {doc.similarity_report_path ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(doc.similarity_report_path!, 'reports', `${baseName}_similarity.pdf`)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {doc.ai_report_path ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(doc.ai_report_path!, 'reports', `${baseName}_ai.pdf`)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {doc.remarks ? (
                              <span className="text-sm text-foreground">{doc.remarks}</span>
                            ) : doc.error_message ? (
                              <span className="text-sm text-destructive">{doc.error_message}</span>
                            ) : doc.status === 'pending' ? (
                              <span className="text-sm text-muted-foreground">In queue</span>
                            ) : doc.status === 'in_progress' ? (
                              <span className="text-sm text-muted-foreground">Processing...</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {role === 'customer' && (
                            <TableCell className="text-center">
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(doc)}
                                  title="Delete document"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this file?
                <br /><br />
                <strong>"{documentToDelete?.file_name}"</strong>
                <br /><br />
                This action cannot be undone. The original document and all associated reports will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
