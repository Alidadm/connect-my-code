import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WITHDRAWAL-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  user_id: string;
  status: "approved" | "rejected" | "completed" | "processing";
  amount: number;
  currency?: string;
  admin_notes?: string;
  payout_email?: string;
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "approved": return "✅";
    case "rejected": return "❌";
    case "completed": return "💰";
    case "processing": return "⏳";
    default: return "📋";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "approved": return "#22c55e";
    case "rejected": return "#ef4444";
    case "completed": return "#10b981";
    case "processing": return "#8b5cf6";
    default: return "#6b7280";
  }
}

function getStatusTitle(status: string): string {
  switch (status) {
    case "approved": return "Withdrawal Approved!";
    case "rejected": return "Withdrawal Request Rejected";
    case "completed": return "Payment Sent Successfully!";
    case "processing": return "Payment Processing";
    default: return "Withdrawal Update";
  }
}

function getStatusMessage(status: string, amount: string, payoutEmail?: string): string {
  switch (status) {
    case "approved":
      return `Great news! Your withdrawal request for <strong>${amount}</strong> has been approved. Payment will be sent to your PayPal account shortly.`;
    case "rejected":
      return `Unfortunately, your withdrawal request for <strong>${amount}</strong> has been rejected. Please see the admin notes below for more details.`;
    case "completed":
      return `Your payment of <strong>${amount}</strong> has been sent to <strong>${payoutEmail || "your PayPal account"}</strong>. Please allow 1-2 business days for the funds to appear.`;
    case "processing":
      return `Your payment of <strong>${amount}</strong> is currently being processed. You'll receive another notification once it's complete.`;
    default:
      return `There's an update on your withdrawal request for <strong>${amount}</strong>.`;
  }
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

    const { user_id, status, amount, currency = "USD", admin_notes, payout_email }: NotificationRequest = await req.json();
    
    if (!user_id || !status || amount === undefined) {
      throw new Error("user_id, status, and amount are required");
    }

    logStep("Processing notification", { user_id: user_id.slice(0, 8) + "...", status });

    // Get user's email and name from profiles_private and profiles
    const { data: privateProfile } = await supabaseAdmin
      .from("profiles_private")
      .select("email")
      .eq("user_id", user_id)
      .single();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, first_name")
      .eq("user_id", user_id)
      .single();

    if (!privateProfile?.email) {
      logStep("No email found for user", { user_id });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No email found for user" 
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

    const statusEmoji = getStatusEmoji(status);
    const statusColor = getStatusColor(status);
    const statusTitle = getStatusTitle(status);
    const statusMessage = getStatusMessage(status, formattedAmount, payout_email);

    // Build email HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">DolphySN</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Withdrawal Update</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 48px;">${statusEmoji}</span>
            </div>
            
            <h2 style="color: ${statusColor}; margin: 0 0 15px 0; text-align: center; font-size: 22px;">
              ${statusTitle}
            </h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hello ${userName},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              ${statusMessage}
            </p>
            
            ${admin_notes ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">Admin Notes:</p>
                <p style="color: #92400e; font-size: 14px; margin: 8px 0 0 0;">${admin_notes}</p>
              </div>
            ` : ""}
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-top: 25px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                      ${status}
                    </span>
                  </td>
                </tr>
                ${payout_email ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">PayPal Email:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${payout_email}</td>
                  </tr>
                ` : ""}
              </table>
            </div>
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
            You're receiving this because you requested a withdrawal from your DolphySN account.
          </p>
        </div>
      </div>
    `;

    const subject = `${statusEmoji} ${statusTitle} - DolphySN`;

    logStep("Sending email via Resend", { to: userEmail.slice(0, 3) + "***" });

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
    logStep("Email sent successfully", { id: emailResult.id });

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
