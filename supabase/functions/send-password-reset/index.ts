import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

async function getSmtpConfig(supabase: any) {
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email']);

  const config: Record<string, string> = {};
  settings?.forEach((s: any) => {
    config[s.key] = s.value;
  });

  return {
    host: config.smtp_host || Deno.env.get('SMTP_HOST') || 'mail.privateemail.com',
    port: parseInt(config.smtp_port || Deno.env.get('SMTP_PORT') || '465'),
    user: config.smtp_user || Deno.env.get('SMTP_USER') || '',
    password: config.smtp_password || Deno.env.get('SMTP_PASSWORD') || '',
    fromEmail: config.smtp_from_email || 'noreply@istilal.com',
  };
}

async function isEmailEnabled(supabase: any, settingKey: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_settings')
    .select('is_enabled')
    .eq('setting_key', settingKey)
    .single();
  
  return data?.is_enabled !== false;
}

async function getSiteUrl(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'site_url')
    .single();
  
  return data?.value || 'https://istilal.com';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if password reset email is enabled
    const isEnabled = await isEmailEnabled(supabase, 'password_reset');
    if (!isEnabled) {
      console.log('Password reset email is disabled in settings');
      return new Response(
        JSON.stringify({ success: true, message: 'Email disabled in settings' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email }: PasswordResetRequest = await req.json();
    console.log('Processing password reset request for:', email);

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      throw new Error('Failed to verify user');
    }

    const userExists = users.users.some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      console.log('User not found, returning success anyway for security');
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link using Supabase Admin API
    // The redirect_to will be where users land AFTER Supabase verifies the token
    const siteUrl = 'https://istilal.com';
    const redirectTo = `${siteUrl}/reset-password`;
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    });

    if (linkError) {
      console.error('Error generating reset link:', linkError);
      throw new Error('Failed to generate reset link');
    }

    // The action_link from Supabase contains the verification URL
    // Format: https://PROJECT.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...
    // We need to use this URL as-is because Supabase needs to verify the token
    // After verification, it will redirect to our redirect_to URL with the session
    const resetLink = linkData.properties?.action_link;
    
    if (!resetLink) {
      console.error('No action link generated');
      throw new Error('Failed to generate reset link');
    }
    
    console.log('Generated reset link for:', email, '- redirects to:', redirectTo);

    const config = await getSmtpConfig(supabase);
    
    if (!config.user || !config.password) {
      throw new Error('SMTP credentials not configured');
    }

    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: true,
        auth: {
          username: config.user,
          password: config.password,
        },
      },
    });

    // Build HTML without extra whitespace to avoid =20 encoding issues
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;"><div style="max-width:600px;margin:0 auto;padding:40px 20px;"><div style="background-color:#ffffff;border-radius:12px;padding:40px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#2d5a27;margin:0;font-size:28px;">Reset Your Password 🔐</h1></div><p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:20px;">Hello,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:20px;">We received a request to reset your password. Click the button below to create a new password.</p><div style="text-align:center;margin:30px 0;"><a href="${resetLink}" style="display:inline-block;background-color:#2d5a27;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Reset Password</a></div><p style="color:#6b7280;font-size:14px;line-height:1.6;">This link will expire in 1 hour for security reasons.</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p></div><p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">© 2024 Istilal. All rights reserved.</p></div></body></html>`;

    try {
      await client.send({
        from: `Istilal <${config.fromEmail}>`,
        to: email,
        subject: 'Reset Your Password - Istilal',
        content: "auto",
        html,
      });
      console.log('Password reset email sent successfully to:', email);
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
