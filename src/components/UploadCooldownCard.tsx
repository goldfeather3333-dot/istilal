import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock3, ShieldAlert } from 'lucide-react';

interface UploadCooldownCardProps {
  remainingSeconds: number;
  cooldownMinutes: number;
  compact?: boolean;
}

export const UploadCooldownCard: React.FC<UploadCooldownCardProps> = ({
  remainingSeconds,
  cooldownMinutes,
  compact = false,
}) => {
  const totalSeconds = cooldownMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  const progress = Math.max(0, Math.min(100, (elapsedSeconds / totalSeconds) * 100));

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (remainingSeconds <= 0) return null;

  if (compact) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Next upload in
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatRemaining(remainingSeconds)}
            </span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>
    );
  }

  return (
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
              You can upload one file every {cooldownMinutes} minutes. Your next upload will be available after the timer ends.
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatRemaining(remainingSeconds)}
            </div>
            <div className="text-xs text-muted-foreground">remaining</div>
          </div>
        </div>

        <Progress value={progress} />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
          One file only is allowed during each {cooldownMinutes}-minute window.
        </div>
      </CardContent>
    </Card>
  );
};
