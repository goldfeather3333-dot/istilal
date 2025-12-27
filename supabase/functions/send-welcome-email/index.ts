import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if welcome email is enabled
    const isEnabled = await isEmailEnabled(supabase, 'welcome_email');
    if (!isEnabled) {
      console.log('Welcome email is disabled in settings');
      return new Response(
        JSON.stringify({ success: true, message: 'Email disabled in settings' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, name }: WelcomeEmailRequest = await req.json();
    console.log('Sending welcome email to:', email);

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;"><div style="max-width:600px;margin:0 auto;padding:40px 20px;"><div style="background-color:#ffffff;border-radius:12px;padding:40px;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#2d5a27;margin:0;font-size:28px;">Welcome to Istilal! 🎉</h1></div><p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:20px;">Hello ${name || 'there'},</p><p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:20px;">Thank you for joining Istilal! We're excited to have you on board.</p><p style="color:#374151;font-size:16px;line-height:1.6;margin-bottom:30px;">Our platform provides professional document similarity detection services. Upload your documents and get detailed reports quickly and securely.</p><div style="text-align:center;margin:30px 0;"><a href="https://istilal.com/dashboard" style="display:inline-block;background-color:#2d5a27;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Get Started</a></div><p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;">If you have any questions, feel free to reach out to our support team.</p></div><p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">© 2024 Istilal. All rights reserved.</p></div></body></html>`;

    try {
      await client.send({
        from: `Istilal <${config.fromEmail}>`,
        to: email,
        subject: 'Welcome to Istilal! 🎉',
        content: "auto",
        html,
      });
      console.log('Welcome email sent successfully');
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
