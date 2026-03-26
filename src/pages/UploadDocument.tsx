// نفس الاستيرادات بدون تغيير
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle, Info, ArrowRight, X } from 'lucide-react';
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    setSelectedFiles([files[0]]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!canUploadNow) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    const results = await uploadDocuments(selectedFiles);

    setUploading(false);
    setUploadResults(results);
    setSelectedFiles([]);

    await refreshCooldown();
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* 🔥 حالة الانتظار */}
        {hasCredits && cooldownChecked && remainingSeconds > 0 && (
          <UploadCooldownCard
            remainingSeconds={remainingSeconds}
            cooldownMinutes={uploadCooldownMinutes}
          />
        )}

        {/* ✅ حالة السماح */}
        {hasCredits && cooldownChecked && remainingSeconds === 0 && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <p className="font-semibold text-green-600">
                ✅ You can upload a new file now
              </p>
            </CardContent>
          </Card>
        )}

        {!hasCredits && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Insufficient Credits</p>
              </div>
              <Button asChild>
                <Link to="/dashboard/credits">Buy Credits</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 🔥 منطقة الرفع */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center ${
            !canUploadNow ? 'opacity-50 pointer-events-none' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDrag}
        >
          <p>Drag and drop one file here</p>
        </div>

        {/* زر الرفع */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!canUploadNow || uploading}
          >
            {uploading ? 'Uploading...' : 'Submit'}
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
