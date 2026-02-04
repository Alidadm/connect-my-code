import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-FAILED-NOTIFICATION] ${step}${detailsStr}`);
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

    const { email, name, amount, currency, nextAttemptDate } = await req.json();
    if (!email) throw new Error("Email is required");

    logStep("Processing payment failed notification for", { email: email.slice(0, 3) + "***" });

    // Get email template from platform_settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "email_templates")
      .single();

    let subject = "Action Required: Your DolphySN Payment Failed";
    let htmlBody = "";

    if (settings?.setting_value?.payment_failed) {
      const template = settings.setting_value.payment_failed;
      subject = template.subject || subject;
      htmlBody = template.body || "";
    }

    // Format amount
    const formattedAmount = `$${(amount || 10.99).toFixed(2)} ${currency || 'USD'}`;

    // Format the next attempt date
    const formattedNextAttempt = nextAttemptDate 
      ? new Date(nextAttemptDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : "soon";

    // Replace placeholders in the template
    htmlBody = htmlBody
      .replace(/\{\{name\}\}/g, name || "Member")
      .replace(/\{\{amount\}\}/g, formattedAmount)
      .replace(/\{\{next_attempt_date\}\}/g, formattedNextAttempt)
      .replace(/\{\{email\}\}/g, email);

    // If no template body, use default
    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Payment Failed</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Action Required</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${name || "Member"},</p>
            <p style="color: #4b5563; font-size: 16px;">
              We were unable to process your payment of <strong>${formattedAmount}</strong> for your 
              DolphySN Premium subscription.
            </p>
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="color: #991b1b; margin: 0; font-size: 14px;">
                <strong>What to do:</strong><br/>
                Please update your payment method to avoid losing access to premium features.
              </p>
            </div>
            <p style="color: #4b5563; font-size: 16px;">
              We'll automatically retry the payment ${formattedNextAttempt !== "soon" ? `on ${formattedNextAttempt}` : formattedNextAttempt}. 
              To avoid interruption, please update your payment details now.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://dolphysn.com/pricing" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Update Payment Method</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you believe this is an error, please contact your bank or our support team.
            </p>
          </div>
        </div>
      `;
    }

    logStep("Sending payment failed notification via Resend");

    const plainText = `Hi ${name || "Member"},\n\nWe were unable to process your payment of ${formattedAmount} for your DolphySN Premium subscription.\n\nPlease update your payment method at https://dolphysn.com/pricing to avoid losing access.\n\nWe'll retry the payment ${formattedNextAttempt}.\n\n— DolphySN Team`;

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
      throw new Error("Failed to send payment failed notification email");
    }

    const resendPayload = await emailResponse.json().catch(() => null);
    logStep("Email sent successfully", { id: resendPayload?.id ?? null });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment failed notification sent",
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
