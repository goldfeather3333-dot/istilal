import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'announcement' | 'payment_reminder' | 'document_status' | 'promotional' | 'welcome' | 'custom';
  targetAudience?: 'all' | 'customers' | 'staff' | 'specific' | 'admins';
  specificUserIds?: string[];
  subject: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  scheduledAt?: string;
  logId?: string;
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

async function sendSingleEmail(config: any, to: string, subject: string, html: string): Promise<boolean> {
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
    return true;
  } catch (error) {
    console.error('Failed to send email to:', to, error);
    return false;
  } finally {
    await client.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      targetAudience, 
      specificUserIds, 
      subject, 
      title, 
      message, 
      ctaText, 
      ctaUrl,
      logId 
    }: EmailRequest = await req.json();

    console.log("Admin email request:", { type, targetAudience, subject, logId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const config = await getSmtpConfig(supabase);
    
    if (!config.user || !config.password) {
      throw new Error('SMTP credentials not configured');
    }

    let emails: string[] = [];

    // Get recipient emails based on target audience
    if (targetAudience === 'specific' && specificUserIds?.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", specificUserIds);
      
      emails = profiles?.map(p => p.email) || [];
    } else if (targetAudience === 'customers') {
      const { data: customerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");
      
      if (customerRoles?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", customerRoles.map(r => r.user_id));
        emails = profiles?.map(p => p.email) || [];
      }
    } else if (targetAudience === 'staff') {
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");
      
      if (staffRoles?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", staffRoles.map(r => r.user_id));
        emails = profiles?.map(p => p.email) || [];
      }
    } else if (targetAudience === 'admins') {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (adminRoles?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", adminRoles.map(r => r.user_id));
        emails = profiles?.map(p => p.email) || [];
      }
    } else {
      // All users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email");
      emails = profiles?.map(p => p.email) || [];
    }

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipients found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending emails to ${emails.length} recipients via SMTP`);

    const siteUrl = "https://istilal.com";

    // Get icon based on email type
    const typeIcons: Record<string, string> = {
      announcement: '📢',
      payment_reminder: '💳',
      document_status: '📄',
      promotional: '🎉',
      welcome: '👋',
      custom: '📧'
    };
    
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
              <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">${typeIcons[type] || '📧'}</span>
              </div>
            </div>
            
            <h1 style="color: #18181b; text-align: center; margin: 0 0 20px 0; font-size: 24px;">${title}</h1>
            
            <div style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            ${ctaText && ctaUrl ? `
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${ctaUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
                ${ctaText}
              </a>
            </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
            
            <p style="color: #a1a1aa; text-align: center; margin: 0; font-size: 12px;">
              This email was sent from Istilal.<br>
              <a href="${siteUrl}" style="color: #10b981; text-decoration: none;">Visit our website</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    let successCount = 0;
    let failedCount = 0;

    // Send emails one by one for privacy
    for (const email of emails) {
      const success = await sendSingleEmail(config, email, subject, htmlContent);
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Email sending complete: ${successCount} success, ${failedCount} failed`);

    // Update email log if logId provided
    if (logId) {
      await supabase
        .from("email_logs")
        .update({
          status: failedCount > 0 ? 'partial' : 'sent',
          success_count: successCount,
          failed_count: failedCount,
          sent_at: new Date().toISOString()
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedCount,
        total: emails.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
