import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FORGOT-PASSWORD-SEND-CODE] ${step}${detailsStr}`);
};

// Generate a 6-digit code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    logStep("Looking up user by email", { email: email.slice(0, 3) + "***" });

    // Find user by email in profiles_private
    const { data: privateProfile, error: lookupError } = await supabaseAdmin
      .from("profiles_private")
      .select("user_id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (lookupError || !privateProfile) {
      logStep("Email not found");
      // Return success anyway to prevent email enumeration attacks
      return new Response(JSON.stringify({ 
        success: true, 
        message: "If this email is registered, you will receive a verification code.",
        expiresIn: 600
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userId = privateProfile.user_id;
    logStep("User found", { userId: userId.slice(0, 8) + "..." });

    // Delete any existing password reset codes for this user
    await supabaseAdmin
      .from("password_reset_codes")
      .delete()
      .eq("user_id", userId);

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database (store email instead of phone)
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_codes")
      .insert({
        user_id: userId,
        phone: email, // Reusing phone column for email
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) throw insertError;

    logStep("Reset code stored");

    // Get email template from platform_settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "email_templates")
      .single();

    let subject = "Your DolphySN Password Reset Code";
    let htmlBody = "";

    if (settings?.setting_value?.forgot_password) {
      const template = settings.setting_value.forgot_password;
      subject = template.subject || subject;
      htmlBody = template.body || "";
    }

    // Replace placeholders in the template
    htmlBody = htmlBody
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{email\}\}/g, email);

    // If no template body, use default
    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">DolphySN</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Code</h2>
            <p style="color: #4b5563; font-size: 16px;">
              You requested to reset your password. Use the code below to verify your identity:
            </p>
            <div style="background: white; border: 2px dashed #1c76e6; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1c76e6;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This code expires in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `;
    }

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
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      logStep("Resend API error", { error: errorData });
      throw new Error("Failed to send email");
    }

    logStep("Email sent successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verification code sent to your email",
      expiresIn: 600
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
