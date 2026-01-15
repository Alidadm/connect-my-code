import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SIGNUP-CONFIRMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, name, userId } = await req.json();
    if (!email || !userId) throw new Error("Email and userId are required");

    logStep("Processing confirmation for", { email: email.slice(0, 3) + "***" });

    // Get email template from platform_settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "email_templates")
      .single();

    let subject = "Welcome to DolphySN - Verify Your Email";
    let htmlBody = "";

    if (settings?.setting_value?.signup_confirmation) {
      const template = settings.setting_value.signup_confirmation;
      subject = template.subject || subject;
      htmlBody = template.body || "";
    }

    // Generate confirmation token (simple base64 encoded userId + timestamp)
    const token = btoa(JSON.stringify({ 
      userId, 
      email, 
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    }));

    // Use SITE_URL if set, otherwise derive from Supabase URL for preview environments
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "";
    const defaultUrl = projectRef ? `https://${projectRef.replace('ahruzugnghcqkonygydo', 'id-preview--7da6d8d7-03a1-4436-af31-faa165a6dce0')}.lovable.app` : "https://dolphysn.com";
    const baseUrl = Deno.env.get("SITE_URL") || defaultUrl;
    const confirmationLink = `${baseUrl}/confirm-email?token=${encodeURIComponent(token)}`;

    // Replace placeholders in the template
    htmlBody = htmlBody
      .replace(/\{\{name\}\}/g, name || "there")
      .replace(/\{\{confirmation_link\}\}/g, confirmationLink)
      .replace(/\{\{email\}\}/g, email);

    // If no template body, use default
    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to DolphySN!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${name || "there"},</p>
            <p style="color: #4b5563; font-size: 16px;">Thank you for joining DolphySN! Please click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
          </div>
        </div>
      `;
    }

    logStep("Sending email via Resend");

    const plainText = `Hi ${name || "there"},\n\nVerify your email address by opening this link (expires in 24 hours):\n${confirmationLink}\n\nIf you didn’t request this, you can ignore this email.\n\n— DolphySN`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DolphySN <noreply@dolphysn.com>",
        to: [email],
        subject: subject,
        text: plainText,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      logStep("Resend API error", { error: errorData });
      throw new Error("Failed to send confirmation email");
    }

    const resendPayload = await emailResponse.json().catch(() => null);
    logStep("Email sent successfully", { id: resendPayload?.id ?? null });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent",
        resend_id: resendPayload?.id ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
