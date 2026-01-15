import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CANCELLATION-NOTIFICATION] ${step}${detailsStr}`);
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

    const { email, name, endDate } = await req.json();
    if (!email) throw new Error("Email is required");

    logStep("Processing cancellation notification for", { email: email.slice(0, 3) + "***" });

    // Get email template from platform_settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "email_templates")
      .single();

    let subject = "Your DolphySN Subscription Has Been Cancelled";
    let htmlBody = "";

    if (settings?.setting_value?.subscription_cancellation) {
      const template = settings.setting_value.subscription_cancellation;
      subject = template.subject || subject;
      htmlBody = template.body || "";
    }

    // Format the end date
    const formattedEndDate = endDate 
      ? new Date(endDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : "the end of your billing period";

    // Replace placeholders in the template
    htmlBody = htmlBody
      .replace(/\{\{name\}\}/g, name || "Member")
      .replace(/\{\{end_date\}\}/g, formattedEndDate)
      .replace(/\{\{email\}\}/g, email);

    // If no template body, use default
    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Subscription Cancelled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">We're Sorry to See You Go</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${name || "Member"},</p>
            <p style="color: #4b5563; font-size: 16px;">
              Your DolphySN Premium subscription has been cancelled. You will continue to have 
              access to premium features until <strong>${formattedEndDate}</strong>.
            </p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Your access ends:</strong> ${formattedEndDate}
              </p>
            </div>
            <p style="color: #4b5563; font-size: 16px;">
              Changed your mind? You can resubscribe anytime from the Pricing page to regain 
              access to all premium features.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://dolphysn.com/pricing" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Resubscribe Now</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you have any feedback about why you cancelled, we'd love to hear from you.
            </p>
          </div>
        </div>
      `;
    }

    logStep("Sending cancellation notification via Resend");

    const plainText = `Hi ${name || "Member"},\n\nYour DolphySN Premium subscription has been cancelled.\n\nYou will continue to have access until: ${formattedEndDate}\n\nChanged your mind? Visit https://dolphysn.com/pricing to resubscribe.\n\n— DolphySN Team`;

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
      throw new Error("Failed to send cancellation notification email");
    }

    const resendPayload = await emailResponse.json().catch(() => null);
    logStep("Email sent successfully", { id: resendPayload?.id ?? null });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cancellation notification sent",
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
