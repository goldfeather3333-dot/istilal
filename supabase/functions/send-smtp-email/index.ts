import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

async function getSmtpConfig(supabase: any) {
  // Try to get SMTP config from database first
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email']);

  const config: Record<string, string> = {};
  settings?.forEach((s: any) => {
    config[s.key] = s.value;
  });

  // Fall back to environment variables if not in database
  return {
    host: config.smtp_host || Deno.env.get('SMTP_HOST') || 'mail.privateemail.com',
    port: parseInt(config.smtp_port || Deno.env.get('SMTP_PORT') || '465'),
    user: config.smtp_user || Deno.env.get('SMTP_USER') || '',
    password: config.smtp_password || Deno.env.get('SMTP_PASSWORD') || '',
    fromEmail: config.smtp_from_email || 'noreply@istilal.com',
  };
}

async function sendEmail(config: any, emailData: EmailRequest): Promise<void> {
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
      from: emailData.from || `Istilal <${config.fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      content: "auto",
      html: emailData.html,
    });
    console.log('Email sent successfully to:', emailData.to);
  } finally {
    await client.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailData: EmailRequest = await req.json();
    console.log('Sending email to:', emailData.to, 'Subject:', emailData.subject);

    const config = await getSmtpConfig(supabase);
    
    if (!config.user || !config.password) {
      throw new Error('SMTP credentials not configured');
    }

    await sendEmail(config, emailData);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
