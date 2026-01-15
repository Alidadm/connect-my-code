import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { token } = await req.json();
    if (!token) throw new Error("Token is required");

    logStep("Processing token");

    // Decode and validate token (supports both URL-safe and standard base64)
    let tokenData;
    try {
      // Convert URL-safe base64 back to standard base64
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padding = base64.length % 4;
      if (padding) {
        base64 += '='.repeat(4 - padding);
      }
      tokenData = JSON.parse(atob(base64));
    } catch {
      throw new Error("Invalid token format");
    }

    const { userId, email, exp } = tokenData;

    if (!userId || !email || !exp) {
      throw new Error("Invalid token data");
    }

    // Check expiration
    if (Date.now() > exp) {
      throw new Error("Token has expired");
    }

    logStep("Token valid, updating profile", { userId: userId.slice(0, 8) + "..." });

    // Update email_verified in profiles table
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", userId);

    if (updateError) {
      logStep("Update error", { error: updateError.message });
      throw new Error("Failed to verify email");
    }

    logStep("Email verified successfully");

    // Send welcome email if Resend is configured
    if (resendApiKey) {
      try {
        logStep("Sending welcome email");

        // Get user profile data
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, display_name, username")
          .eq("user_id", userId)
          .single();

        const firstName = profile?.first_name || "";
        const lastName = profile?.last_name || "";
        const displayName = profile?.display_name || `${firstName} ${lastName}`.trim() || "User";
        const username = profile?.username || "";

        // Get welcome email template from platform_settings
        const { data: settings } = await supabaseAdmin
          .from("platform_settings")
          .select("setting_value")
          .eq("setting_key", "email_templates")
          .single();

        let subject = "Welcome to DolphySN! 🎉";
        let htmlBody = "";

        if (settings?.setting_value?.welcome) {
          const template = settings.setting_value.welcome;
          subject = template.subject || subject;
          htmlBody = template.body || "";
        }

        // Replace placeholders in the template
        htmlBody = htmlBody
          .replace(/\{\{name\}\}/g, displayName)
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{username\}\}/g, username)
          .replace(/\{\{email\}\}/g, email);

        // If no template body, use default
        if (!htmlBody) {
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎉 Welcome to DolphySN!</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">Hey ${firstName || "there"}!</h2>
                <p style="color: #4b5563; font-size: 16px;">
                  Your email has been verified and your account is now fully activated. Welcome to the DolphySN community!
                </p>
                <p style="color: #4b5563; font-size: 16px;">
                  Here's what you can do next:
                </p>
                <ul style="color: #4b5563; font-size: 16px;">
                  <li>Complete your profile</li>
                  <li>Connect with friends</li>
                  <li>Join groups and communities</li>
                  <li>Share your first post</li>
                </ul>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://dolphysn.com" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Get Started
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  We're excited to have you on board!<br/>
                  — The DolphySN Team
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
          logStep("Resend API error for welcome email", { error: errorData });
        } else {
          logStep("Welcome email sent successfully");
        }
      } catch (emailError) {
        // Don't fail the confirmation if welcome email fails
        logStep("Failed to send welcome email", { error: String(emailError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email verified successfully"
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