import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotificationRequest {
  orderId: string;
  type: "approved" | "rejected" | "started" | "ended";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { orderId, type } = await req.json() as NotificationRequest;

    if (!orderId || !type) {
      throw new Error("Order ID and notification type are required");
    }

    // Get order with campaign details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("ad_orders")
      .select(`
        *,
        campaign:ad_campaigns(*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get user email
    let recipientEmail: string | null = null;
    let recipientName: string = "Advertiser";

    if (order.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      recipientEmail = userData?.user?.email || null;
      
      // Try to get profile name
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, first_name")
        .eq("user_id", order.user_id)
        .single();
      
      if (profile) {
        recipientName = profile.display_name || profile.first_name || "Advertiser";
      }
    } else if (order.guest_email) {
      recipientEmail = order.guest_email;
      recipientName = order.guest_name || "Advertiser";
    }

    if (!recipientEmail) {
      throw new Error("No recipient email found");
    }

    const campaignName = order.campaign?.name || "Your Campaign";
    const startDate = order.campaign?.start_date 
      ? new Date(order.campaign.start_date).toLocaleDateString()
      : "N/A";
    const endDate = order.campaign?.end_date
      ? new Date(order.campaign.end_date).toLocaleDateString()
      : "N/A";

    let subject: string;
    let htmlContent: string;

    switch (type) {
      case "approved":
        subject = `🎉 Your Ad Campaign "${campaignName}" Has Been Approved!`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Great News! Your Ad is Approved</h1>
            <p>Hi ${recipientName},</p>
            <p>We're excited to let you know that your ad campaign <strong>"${campaignName}"</strong> has been approved and is now active!</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">Campaign Details</h3>
              <p style="margin: 5px 0;"><strong>Campaign:</strong> ${campaignName}</p>
              <p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>
              <p style="margin: 5px 0;"><strong>End Date:</strong> ${endDate}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Active</p>
            </div>
            
            <p>Your payment has been processed and your ad is now running. You can view your campaign performance in the Ads Manager.</p>
            
            <p>Thank you for advertising with us!</p>
            <p>– The Ads Team</p>
          </div>
        `;
        break;

      case "rejected":
        subject = `Ad Campaign "${campaignName}" Update`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Campaign Not Approved</h1>
            <p>Hi ${recipientName},</p>
            <p>We regret to inform you that your ad campaign <strong>"${campaignName}"</strong> was not approved.</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">What This Means</h3>
              <p style="margin: 5px 0;">• Your payment authorization has been released</p>
              <p style="margin: 5px 0;">• No charges have been made to your card</p>
              <p style="margin: 5px 0;">• You can submit a new campaign anytime</p>
            </div>
            
            ${order.admin_notes ? `<p><strong>Reason:</strong> ${order.admin_notes}</p>` : ""}
            
            <p>If you have questions about this decision, please contact our support team.</p>
            
            <p>– The Ads Team</p>
          </div>
        `;
        break;

      case "started":
        subject = `🚀 Your Ad Campaign "${campaignName}" is Now Live!`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Your Campaign is Live!</h1>
            <p>Hi ${recipientName},</p>
            <p>Your ad campaign <strong>"${campaignName}"</strong> has started running today!</p>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">Campaign Details</h3>
              <p style="margin: 5px 0;"><strong>Campaign:</strong> ${campaignName}</p>
              <p style="margin: 5px 0;"><strong>Running Until:</strong> ${endDate}</p>
            </div>
            
            <p>Your ads are now being shown to your target audience. Check back in the Ads Manager to see performance metrics.</p>
            
            <p>– The Ads Team</p>
          </div>
        `;
        break;

      case "ended":
        subject = `Ad Campaign "${campaignName}" Has Ended`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6b7280;">Campaign Completed</h1>
            <p>Hi ${recipientName},</p>
            <p>Your ad campaign <strong>"${campaignName}"</strong> has ended.</p>
            
            <div style="background: #f9fafb; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">Campaign Summary</h3>
              <p style="margin: 5px 0;"><strong>Campaign:</strong> ${campaignName}</p>
              <p style="margin: 5px 0;"><strong>Ran From:</strong> ${startDate} to ${endDate}</p>
            </div>
            
            <p>Thank you for advertising with us! You can view your final campaign performance in the Ads Manager.</p>
            
            <p>Ready to run another campaign? <a href="${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}/ads">Create a new ad</a></p>
            
            <p>– The Ads Team</p>
          </div>
        `;
        break;

      default:
        throw new Error("Invalid notification type");
    }

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Notification logged (email not configured)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ads <ads@dolphysn.com>",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${type} notification sent to ${recipientEmail}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-ad-notification:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
