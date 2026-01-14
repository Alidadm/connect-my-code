import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMMISSION-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  referrer_id: string;
  type: "commission_earned" | "payout_completed";
  amount: number;
  currency?: string;
  referred_user_name?: string;
  payout_method?: string;
}

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

    const { 
      referrer_id, 
      type, 
      amount, 
      currency = "USD", 
      referred_user_name,
      payout_method 
    }: NotificationRequest = await req.json();
    
    if (!referrer_id || !type || amount === undefined) {
      throw new Error("referrer_id, type, and amount are required");
    }

    logStep("Processing notification", { referrer_id: referrer_id.slice(0, 8) + "...", type });

    // Get referrer's email and name
    const { data: privateProfile } = await supabaseAdmin
      .from("profiles_private")
      .select("email")
      .eq("user_id", referrer_id)
      .single();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, first_name")
      .eq("user_id", referrer_id)
      .single();

    if (!privateProfile?.email) {
      logStep("No email found for referrer", { referrer_id });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No email found for referrer" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userEmail = privateProfile.email;
    const userName = profile?.display_name || profile?.first_name || "there";
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);

    let subject: string;
    let emoji: string;
    let title: string;
    let message: string;
    let color: string;

    if (type === "commission_earned") {
      emoji = "🎉";
      color = "#22c55e";
      title = "You Earned a Commission!";
      subject = `${emoji} You just earned ${formattedAmount}! - DolphySN`;
      message = referred_user_name 
        ? `Great news! <strong>${referred_user_name}</strong> just renewed their subscription, and you've earned a <strong>${formattedAmount}</strong> commission!`
        : `Great news! One of your referrals just paid for their subscription, and you've earned a <strong>${formattedAmount}</strong> commission!`;
    } else {
      emoji = "💰";
      color = "#10b981";
      title = "Payout Sent to Your Bank!";
      subject = `${emoji} ${formattedAmount} sent to your bank! - DolphySN`;
      const payoutInfo = payout_method === "stripe" 
        ? "Your funds have been sent directly to your connected bank account via Stripe. Expect to see them within 2-3 business days."
        : "Your funds have been sent to your PayPal account. Please allow 1-2 business days for the funds to appear.";
      message = `Your commission payout of <strong>${formattedAmount}</strong> has been processed! ${payoutInfo}`;
    }

    // Build email HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">DolphySN</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Commission Update</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 48px;">${emoji}</span>
            </div>
            
            <h2 style="color: ${color}; margin: 0 0 15px 0; text-align: center; font-size: 22px;">
              ${title}
            </h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hello ${userName},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              ${message}
            </p>
            
            <div style="background: ${color}15; border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">Amount</p>
              <p style="color: ${color}; font-size: 32px; font-weight: bold; margin: 0;">${formattedAmount}</p>
            </div>
            
            ${type === "commission_earned" ? `
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
                  💡 <strong>Tip:</strong> Connect your Stripe account to receive automatic payouts directly to your bank!
                </p>
              </div>
            ` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://dolphysn.com/commissions" style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;">
              View Commissions Dashboard
            </a>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; background: #1f2937; border-radius: 0 0 10px 10px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} DolphySN. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
            You're receiving this because you're part of the DolphySN referral program.
          </p>
        </div>
      </div>
    `;

    logStep("Sending email via Resend", { to: userEmail.slice(0, 3) + "***", type });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DolphySN <noreply@dolphysn.com>",
        to: [userEmail],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      logStep("Resend API error", { error: errorData });
      throw new Error("Failed to send notification email");
    }

    const emailResult = await emailResponse.json();
    logStep("Email sent successfully", { id: emailResult.id, type });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification email sent",
      email_id: emailResult.id
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
