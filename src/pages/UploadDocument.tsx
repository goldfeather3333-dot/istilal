import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle, Info, ArrowRight, X, Clock3, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { UploadCooldownCard } from '@/components/UploadCooldownCard';
export default function UploadDocument() {
  const { profile } = useAuth();
  const { uploadDocuments, getLastUploadInfo, uploadCooldownMinutes } = useDocuments();
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number } | null>(null);

  const [excludeBibliographic, setExcludeBibliographic] = useState(true);
  const [excludeQuoted, setExcludeQuoted] = useState(true);
  const [excludeSmallSources, setExcludeSmallSources] = useState(true);

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cooldownChecked, setCooldownChecked] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const creditBalance = profile?.credit_balance || 0;
  const hasCredits = creditBalance >= 1;
  const maxFilesAllowed = hasCredits ? 1 : 0;

  const refreshCooldown = async () => {
    const info = await getLastUploadInfo();
    setRemainingSeconds(info.remainingSeconds);
    setCooldownChecked(true);
  };

  useEffect(() => {
    refreshCooldown();
  }, []);

  useEffect(() => {
    if (!cooldownChecked) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownChecked]);

  const canUploadNow = hasCredits && remainingSeconds === 0;
  const cooldownProgress = useMemo(() => {
    const total = uploadCooldownMinutes * 60;
    const elapsed = total - remainingSeconds;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }, [remainingSeconds, uploadCooldownMinutes]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const addFiles = (newFiles: File[]) => {
    setUploadResults(null);
    if (!newFiles.length) return;
    const firstFile = newFiles[0];
    setSelectedFiles([firstFile]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!canUploadNow || selectedFiles.length >= maxFilesAllowed) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (!canUploadNow || selectedFiles.length >= maxFilesAllowed) return;

    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const results = await uploadDocuments(
      selectedFiles,
      (current, total) => {
        setUploadProgress({ current, total });
      },
      {
        uploadType: 'single',
        exclusions: {
          exclude_bibliographic: excludeBibliographic,
          exclude_quoted: excludeQuoted,
          exclude_small_sources: excludeSmallSources,
        }
      }
    );

    setUploading(false);
    setUploadResults(results);
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = '';

    await refreshCooldown();
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = '';
    navigate('/dashboard/documents');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Add new submission</h1>
          <p className="text-muted-foreground mt-1">
            Please fill out the following fields to submit your document for plagiarism checking. Each field is important to ensure your document is processed accurately.
          </p>
        </div>

        {!hasCredits && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Insufficient Credits</p>
                <p className="text-sm text-muted-foreground">
                  You need at least 1 credit to upload a document
                </p>
              </div>
              <Button asChild>
                <Link to="/dashboard/credits">Buy Credits</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {hasCredits && cooldownChecked && remainingSeconds > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock3 className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Upload cooldown is active
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can upload one file every {uploadCooldownMinutes} minutes. Your next upload will be available after the timer ends.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatRemaining(remainingSeconds)}
                  </div>
                  <div className="text-xs text-muted-foreground">remaining</div>
                </div>
              </div>

              <Progress value={cooldownProgress} />

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                One file only is allowed during each {uploadCooldownMinutes}-minute window.
              </div>
            </CardContent>
          </Card>
        )}

        {uploadResults && (
          <Card className="border-secondary bg-secondary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-secondary" />
              <div className="flex-1">
                <p className="font-medium text-secondary">
                  {uploadResults.success} Document{uploadResults.success !== 1 ? 's' : ''} Uploaded Successfully!
                </p>
                <p className="text-sm text-muted-foreground">
                  {uploadResults.failed > 0 && `${uploadResults.failed} failed. `}
                  Your document is now in the queue and will be processed soon.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/dashboard/documents">View Documents</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {uploading && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Uploading document...</p>
                <p className="text-sm text-muted-foreground">
                  {uploadProgress.current} / {uploadProgress.total}
                </p>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <Label className="text-base">Options ( exclusion )</Label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-bibliographic" className="font-normal cursor-pointer">
                Exclude bibliographic materials
              </Label>
              <Switch
                id="exclude-bibliographic"
                checked={excludeBibliographic}
                onCheckedChange={setExcludeBibliographic}
                disabled={!hasCredits}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-quoted" className="font-normal cursor-pointer">
                Exclude quoted materials
              </Label>
              <Switch
                id="exclude-quoted"
                checked={excludeQuoted}
                onCheckedChange={setExcludeQuoted}
                disabled={!hasCredits}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-small" className="font-normal cursor-pointer">
                Exclude sources that are less than 1%
              </Label>
              <Switch
                id="exclude-small"
                checked={excludeSmallSources}
                onCheckedChange={setExcludeSmallSources}
                disabled={!hasCredits}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base">Documents</Label>
            <span className="text-sm text-muted-foreground">
              {selectedFiles.length} / {maxFilesAllowed} file selected
            </span>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            } ${!canUploadNow || selectedFiles.length >= maxFilesAllowed ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.html,.rtf,.odt"
              onChange={handleChange}
              disabled={!canUploadNow || selectedFiles.length >= maxFilesAllowed}
            />

            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Drag and drop one file here</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>You can upload only <strong className="text-foreground">1 file</strong> every <strong className="text-foreground">{uploadCooldownMinutes} minutes</strong></p>
                <p>Each file must be less than <strong className="text-foreground">100 MB</strong></p>
                <p>Supported file types:</p>
                <p className="text-amber-600 dark:text-amber-500">.docx, .xlsx, .pptx, .ps, .pdf, .html, .rtf, .odt, .hwp, .txt</p>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label className="text-sm">Selected File ({selectedFiles.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>The file you are submitting will not be added to any repository.</p>
              <p>You can upload one new file every {uploadCooldownMinutes} minutes.</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cost per document</p>
              <p className="text-xs text-muted-foreground">Includes similarity + AI detection</p>
            </div>
            <p className="text-xl font-bold">1 Credit</p>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <p className="text-sm">Your balance</p>
            <p className="font-semibold">{creditBalance} Credits</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-sm">Total cost</p>
              <p className="font-semibold text-primary">1 Credit</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!canUploadNow || selectedFiles.length === 0 || uploading}
            className="gap-2"
          >
            {uploading ? 'Submitting...' : 'Submit'}
            {!uploading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
