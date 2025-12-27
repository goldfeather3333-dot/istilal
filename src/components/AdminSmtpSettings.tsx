import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Server, Lock, Send, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function AdminSmtpSettings() {
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: 'mail.privateemail.com',
    smtp_port: '465',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: 'noreply@istilal.com',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchSmtpConfig();
  }, []);

  const fetchSmtpConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email']);

      if (error) throw error;

      const config: Record<string, string> = {};
      data?.forEach((s) => {
        config[s.key] = s.value;
      });

      setSmtpConfig(prev => ({
        ...prev,
        ...config,
      }));
    } catch (error) {
      console.error('Error fetching SMTP config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert each setting
      for (const [key, value] of Object.entries(smtpConfig)) {
        const { error } = await supabase
          .from('settings')
          .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast.success('SMTP settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save SMTP settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from Istilal',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="color: #667eea;">Test Email Successful! ✅</h1>
              <p>This is a test email from your Istilal SMTP configuration.</p>
              <p>If you received this email, your SMTP settings are configured correctly.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">Sent from Istilal Admin Panel</p>
            </div>
          `,
        },
      });

      if (error) throw error;

      toast.success('Test email sent successfully! Check your inbox.');
    } catch (error: any) {
      toast.error('Failed to send test email: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SMTP Server Configuration
          </CardTitle>
          <CardDescription>
            Configure your email server settings for sending transactional and promotional emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={smtpConfig.smtp_host}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="mail.privateemail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                value={smtpConfig.smtp_port}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_port: e.target.value }))}
                placeholder="465"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_user">Username / Email</Label>
            <Input
              id="smtp_user"
              value={smtpConfig.smtp_user}
              onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
              placeholder="noreply@istilal.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_password">Password</Label>
            <div className="relative">
              <Input
                id="smtp_password"
                type={showPassword ? 'text' : 'password'}
                value={smtpConfig.smtp_password}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                placeholder="Enter SMTP password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_from_email">From Email Address</Label>
            <Input
              id="smtp_from_email"
              value={smtpConfig.smtp_from_email}
              onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_from_email: e.target.value }))}
              placeholder="noreply@istilal.com"
            />
          </div>

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your SMTP credentials are stored securely and encrypted. Connection uses SSL/TLS on port 465.
            </AlertDescription>
          </Alert>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save SMTP Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Email Configuration
          </CardTitle>
          <CardDescription>
            Send a test email to verify your SMTP settings are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1"
            />
            <Button onClick={handleTestEmail} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
