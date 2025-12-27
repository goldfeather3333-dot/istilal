import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users,
  Calendar,
  History,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailLog {
  id: string;
  title: string;
  subject: string;
  message: string;
  type: string;
  target_audience: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
  cta_text: string | null;
  cta_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: 'Sent', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  partial: { label: 'Partial', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Clock },
  sending: { label: 'Sending', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Loader2 },
};

const audienceLabels: Record<string, string> = {
  all: 'All Users',
  customers: 'Customers Only',
  staff: 'Staff Only',
  admins: 'Admins Only',
};

export const AdminEmailHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as EmailLog[];
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (log: EmailLog) => {
      setResendingId(log.id);
      
      // Update the log status to sending
      await supabase
        .from('email_logs')
        .update({ status: 'sending', success_count: 0, failed_count: 0 })
        .eq('id', log.id);

      // Resend the email
      const { data, error } = await supabase.functions.invoke('admin-send-email', {
        body: {
          type: log.type,
          targetAudience: log.target_audience,
          subject: log.subject,
          title: log.title,
          message: log.message,
          ctaText: log.cta_text || undefined,
          ctaUrl: log.cta_url || undefined,
          logId: log.id
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Emails Resent Successfully!', 
        description: `Sent to ${data.sent} recipients${data.failed > 0 ? `, ${data.failed} failed` : ''}.` 
      });
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to resend emails', 
        description: error.message, 
        variant: 'destructive' 
      });
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onSettled: () => {
      setResendingId(null);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSent = emailLogs?.reduce((acc, log) => acc + log.success_count, 0) || 0;
  const totalFailed = emailLogs?.reduce((acc, log) => acc + log.failed_count, 0) || 0;
  const totalEmails = emailLogs?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Email History</h2>
          <p className="text-sm text-muted-foreground">
            View all sent emails and their delivery status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmails}</p>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFailed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
          <CardDescription>Last 100 email campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {!emailLogs || emailLogs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No emails sent yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start sending emails from the "Send Emails" tab
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {emailLogs.map((log) => {
                  const config = statusConfig[log.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  const successRate = log.recipient_count > 0 
                    ? Math.round((log.success_count / log.recipient_count) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={log.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{log.title}</h4>
                            <Badge variant="outline" className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {log.subject}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {audienceLabels[log.target_audience] || log.target_audience}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {log.recipient_count} recipients
                            </span>
                            {log.sent_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(log.sent_at), 'MMM d, yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-500">{log.success_count} ✓</span>
                            {log.failed_count > 0 && (
                              <span className="text-red-500">{log.failed_count} ✗</span>
                            )}
                          </div>
                          {log.recipient_count > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {successRate}% success
                            </p>
                          )}
                          {(log.status === 'failed' || log.status === 'partial' || log.failed_count > 0) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => resendMutation.mutate(log)}
                              disabled={resendingId === log.id}
                            >
                              {resendingId === log.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Resend
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};