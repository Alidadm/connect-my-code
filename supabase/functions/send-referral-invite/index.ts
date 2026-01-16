import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-REFERRAL-INVITE] ${step}${detailsStr}`);
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

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      throw new Error("Unauthorized");
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body = await req.json();
    const { recipientEmail, subject, message } = body;

    if (!recipientEmail || !subject || !message) {
      throw new Error("recipientEmail, subject, and message are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Invalid email address");
    }

    // Get the sender's profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, first_name, last_name, username")
      .eq("user_id", user.id)
      .single();

    const senderName = profile?.display_name || 
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
      "A DolphySN Member";

    const referralUrl = profile?.username 
      ? `https://dolphysn.com/${profile.username}`
      : "https://dolphysn.com";

    logStep("Sending referral invite", { 
      to: recipientEmail.slice(0, 3) + "***",
      from: senderName 
    });

    // Build the email HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">You're Invited to DolphySN!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${referralUrl}" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join DolphySN Now</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Your referral link: <a href="${referralUrl}" style="color: #1c76e6;">${referralUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This invitation was sent by ${senderName} via DolphySN.
          </p>
        </div>
      </div>
    `;

    const plainText = `${message}\n\nJoin here: ${referralUrl}\n\n---\nThis invitation was sent by ${senderName} via DolphySN.`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} via DolphySN <noreply@dolphysn.com>`,
        to: [recipientEmail],
        subject: subject,
        text: plainText,
        html: htmlBody,
        reply_to: user.email,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      logStep("Resend API error", { error: errorData });
      throw new Error("Failed to send invitation email");
    }

    const resendPayload = await emailResponse.json().catch(() => null);
    logStep("Email sent successfully", { id: resendPayload?.id ?? null });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
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
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 400,
      }
    );
  }
});
