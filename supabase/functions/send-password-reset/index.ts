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
    .maybeSingle();
  return data?.is_enabled ?? true;
}

async function sendEmail(config: any, to: string, subject: string, html: string): Promise<void> {
  console.log('Connecting to SMTP server:', config.host, 'port:', config.port);
  
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

  try {
    await client.send({
      from: `Istilal <${config.fromEmail}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });
    console.log('Email sent successfully to:', to);
  } finally {
    await client.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log('Processing password reset for:', email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const enabled = await isEmailEnabled(supabase, 'password_reset');
    if (!enabled) {
      console.log('Password reset emails are disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Password reset emails are disabled' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const siteUrl = "https://istilal.com";

    // Generate password reset link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    });

    if (linkError) {
      throw linkError;
    }

    const config = await getSmtpConfig(supabase);
    
    if (!config.user || !config.password) {
      throw new Error('SMTP credentials not configured');
    }

    const userName = profile.full_name || email.split('@')[0];
    const resetLink = linkData.properties?.action_link;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">🔐</span>
              </div>
            </div>
            
            <h1 style="color: #18181b; text-align: center; margin: 0 0 10px 0; font-size: 24px;">Reset Your Password</h1>
            
            <p style="color: #71717a; text-align: center; margin: 0 0 30px 0;">Hello ${userName}, we received a request to reset your password.</p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #71717a; text-align: center; margin: 0 0 20px 0; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
            
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e; font-size: 14px; text-align: center;">
                If you didn't request this password reset, you can safely ignore this email.
              </p>
            </div>
            
            <p style="color: #a1a1aa; text-align: center; margin: 30px 0 0 0; font-size: 12px;">
              This is an automated email from Istilal. Please do not reply.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(config, email, 'Reset Your Password - Istilal', htmlContent);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent' }),
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
