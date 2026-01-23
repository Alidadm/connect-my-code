import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-RENEWAL-NOTIFICATION] ${step}${detailsStr}`);
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

    const { email, name, amount, currency, nextBillingDate } = await req.json();
    if (!email) throw new Error("Email is required");

    logStep("Processing renewal notification for", { email: email.slice(0, 3) + "***" });

    // ========== DEDUPLICATION CHECK ==========
    // Prevent sending multiple renewal emails to the same address on the same day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dedupeKey = `renewal_email_${email.toLowerCase()}_${today}`;

    // Check if we already sent a renewal email to this address today
    const { data: existingNotification } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", dedupeKey)
      .single();

    if (existingNotification) {
      logStep("Duplicate email prevented - already sent today", { email: email.slice(0, 3) + "***", date: today });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Renewal notification already sent today - skipped to prevent duplicate",
          skipped: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Also verify the user still exists in our system before sending
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = authUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userExists) {
      logStep("User no longer exists - skipping email", { email: email.slice(0, 3) + "***" });
      return new Response(
        JSON.stringify({
          success: true,
          message: "User no longer exists - skipped",
          skipped: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get email template from platform_settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "email_templates")
      .single();

    let subject = "Your DolphySN Subscription Has Been Renewed";
    let htmlBody = "";

    if (settings?.setting_value?.subscription_renewal) {
      const template = settings.setting_value.subscription_renewal;
      subject = template.subject || subject;
      htmlBody = template.body || "";
    }

    // Format the next billing date
    const formattedDate = nextBillingDate 
      ? new Date(nextBillingDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : "your next billing cycle";

    // Format amount
    const formattedAmount = `$${(amount || 9.99).toFixed(2)} ${currency || 'USD'}`;

    // Replace placeholders in the template
    htmlBody = htmlBody
      .replace(/\{\{name\}\}/g, name || "Member")
      .replace(/\{\{amount\}\}/g, formattedAmount)
      .replace(/\{\{next_billing_date\}\}/g, formattedDate)
      .replace(/\{\{email\}\}/g, email);

    // If no template body, use default
    if (!htmlBody) {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Subscription Renewed!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Continued Support</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello ${name || "Member"},</p>
            <p style="color: #4b5563; font-size: 16px;">
              Your DolphySN Premium subscription has been successfully renewed. 
              We've charged <strong>${formattedAmount}</strong> to your payment method.
            </p>
            <div style="background: #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #374151; margin: 0; font-size: 14px;">
                <strong>Payment Details:</strong><br/>
                Amount: ${formattedAmount}<br/>
                Next Billing Date: ${formattedDate}
              </p>
            </div>
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for being part of the DolphySN community! Your membership helps us 
              continue building amazing features for our platform.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you have any questions about your subscription, please contact our support team.
            </p>
          </div>
        </div>
      `;
    }

    logStep("Sending renewal notification via Resend");

    const plainText = `Hi ${name || "Member"},\n\nYour DolphySN Premium subscription has been successfully renewed.\n\nPayment Details:\nAmount: ${formattedAmount}\nNext Billing Date: ${formattedDate}\n\nThank you for your continued support!\n\n— DolphySN Team`;

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
      throw new Error("Failed to send renewal notification email");
    }

    const resendPayload = await emailResponse.json().catch(() => null);
    logStep("Email sent successfully", { id: resendPayload?.id ?? null });

    // ========== RECORD DEDUPLICATION MARKER ==========
    // Store that we sent a renewal email to this address today (auto-expires by not having cleanup, but prevents same-day duplicates)
    await supabaseAdmin
      .from("platform_settings")
      .upsert({
        setting_key: dedupeKey,
        setting_value: { sent_at: new Date().toISOString(), email: email.toLowerCase() },
        updated_at: new Date().toISOString(),
      });

    logStep("Deduplication marker stored", { key: dedupeKey });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Renewal notification sent",
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
