import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMMISSION-DIGEST] ${step}${detailsStr}`);
};

interface NotificationGroup {
  referrer_id: string;
  notifications: {
    id: string;
    notification_type: string;
    amount: number;
    currency: string;
    referred_user_name: string | null;
    payout_method: string | null;
    payment_provider: string | null;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Daily digest function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate a batch ID for this run
    const batchId = crypto.randomUUID();
    logStep("Processing batch", { batchId });

    // Fetch all unsent notifications
    const { data: pendingNotifications, error: fetchError } = await supabaseAdmin
      .from("pending_commission_notifications")
      .select("*")
      .is("sent_at", null)
      .order("referrer_id")
      .order("created_at");

    if (fetchError) {
      throw new Error(`Failed to fetch pending notifications: ${fetchError.message}`);
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      logStep("No pending notifications to send");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending notifications",
        emails_sent: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found pending notifications", { count: pendingNotifications.length });

    // Group notifications by referrer
    const groupedNotifications: Map<string, NotificationGroup> = new Map();
    
    for (const notification of pendingNotifications) {
      const existing = groupedNotifications.get(notification.referrer_id);
      if (existing) {
        existing.notifications.push({
          id: notification.id,
          notification_type: notification.notification_type,
          amount: notification.amount,
          currency: notification.currency || "USD",
          referred_user_name: notification.referred_user_name,
          payout_method: notification.payout_method,
          payment_provider: notification.payment_provider,
        });
      } else {
        groupedNotifications.set(notification.referrer_id, {
          referrer_id: notification.referrer_id,
          notifications: [{
            id: notification.id,
            notification_type: notification.notification_type,
            amount: notification.amount,
            currency: notification.currency || "USD",
            referred_user_name: notification.referred_user_name,
            payout_method: notification.payout_method,
            payment_provider: notification.payment_provider,
          }],
        });
      }
    }

    logStep("Grouped notifications by referrer", { referrerCount: groupedNotifications.size });

    let emailsSent = 0;
    const notificationIds: string[] = [];

    // Process each referrer's notifications
    for (const [referrerId, group] of groupedNotifications) {
      try {
        // Get referrer's email and name
        const { data: privateProfile } = await supabaseAdmin
          .from("profiles_private")
          .select("email")
          .eq("user_id", referrerId)
          .single();

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, first_name")
          .eq("user_id", referrerId)
          .single();

        if (!privateProfile?.email) {
          logStep("No email found for referrer, skipping", { referrerId });
          continue;
        }

        const userEmail = privateProfile.email;
        const userName = profile?.display_name || profile?.first_name || "there";

        // Calculate totals
        const commissionsEarned = group.notifications.filter(n => n.notification_type === "commission_earned");
        const payoutsCompleted = group.notifications.filter(n => n.notification_type === "payout_completed");

        const totalEarned = commissionsEarned.reduce((sum, n) => sum + n.amount, 0);
        const totalPaidOut = payoutsCompleted.reduce((sum, n) => sum + n.amount, 0);
        const currency = group.notifications[0]?.currency || "USD";

        const formatAmount = (amount: number) => new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(amount);

        // Build summary email
        let subject = "";
        let emoji = "";
        
        if (commissionsEarned.length > 0 && payoutsCompleted.length > 0) {
          emoji = "💰";
          subject = `${emoji} Daily Summary: ${formatAmount(totalEarned)} earned, ${formatAmount(totalPaidOut)} paid out!`;
        } else if (commissionsEarned.length > 0) {
          emoji = "🎉";
          subject = `${emoji} Daily Summary: You earned ${formatAmount(totalEarned)} today!`;
        } else {
          emoji = "💸";
          subject = `${emoji} Daily Summary: ${formatAmount(totalPaidOut)} sent to your account!`;
        }

        // Build commission details HTML
        let commissionsHtml = "";
        if (commissionsEarned.length > 0) {
          commissionsHtml = `
            <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h3 style="color: #059669; margin: 0 0 10px 0; font-size: 16px;">🎉 Commissions Earned (${commissionsEarned.length})</h3>
              <table style="width: 100%; font-size: 14px;">
                ${commissionsEarned.map(c => `
                  <tr>
                    <td style="padding: 5px 0; color: #374151;">${c.referred_user_name || "A referral"} paid</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #059669;">+${formatAmount(c.amount)}</td>
                  </tr>
                `).join("")}
                <tr style="border-top: 1px solid #d1fae5;">
                  <td style="padding: 10px 0 5px 0; font-weight: bold; color: #374151;">Total Earned</td>
                  <td style="padding: 10px 0 5px 0; text-align: right; font-weight: bold; color: #059669; font-size: 18px;">${formatAmount(totalEarned)}</td>
                </tr>
              </table>
            </div>
          `;
        }

        let payoutsHtml = "";
        if (payoutsCompleted.length > 0) {
          payoutsHtml = `
            <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 16px;">💸 Payouts Sent (${payoutsCompleted.length})</h3>
              <table style="width: 100%; font-size: 14px;">
                ${payoutsCompleted.map(c => `
                  <tr>
                    <td style="padding: 5px 0; color: #374151;">Via ${c.payout_method === "stripe" ? "Bank (Stripe)" : "PayPal"}</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #16a34a;">${formatAmount(c.amount)}</td>
                  </tr>
                `).join("")}
                <tr style="border-top: 1px solid #bbf7d0;">
                  <td style="padding: 10px 0 5px 0; font-weight: bold; color: #374151;">Total Paid Out</td>
                  <td style="padding: 10px 0 5px 0; text-align: right; font-weight: bold; color: #16a34a; font-size: 18px;">${formatAmount(totalPaidOut)}</td>
                </tr>
              </table>
            </div>
          `;
        }

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #1c76e6 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">DolphySN</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Daily Commission Summary</p>
            </div>
            
            <div style="padding: 30px; background: #f9fafb;">
              <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 48px;">${emoji}</span>
                </div>
                
                <h2 style="color: #1f2937; margin: 0 0 15px 0; text-align: center; font-size: 22px;">
                  Your Daily Summary
                </h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Hello ${userName},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Here's a summary of your commission activity for today:
                </p>

                ${commissionsHtml}
                ${payoutsHtml}

                ${payoutsCompleted.length > 0 ? `
                  <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
                      💡 Funds typically arrive within 1-3 business days depending on your payout method.
                    </p>
                  </div>
                ` : `
                  <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
                      💡 <strong>Tip:</strong> Connect your Stripe account to receive automatic payouts directly to your bank!
                    </p>
                  </div>
                `}
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
                This is your daily commission digest. You're receiving this because you're part of the DolphySN referral program.
              </p>
            </div>
          </div>
        `;

        logStep("Sending digest email", { to: userEmail.slice(0, 3) + "***", notificationCount: group.notifications.length });

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
          logStep("Resend API error", { error: errorData, referrerId });
          continue;
        }

        const emailResult = await emailResponse.json();
        logStep("Digest email sent", { id: emailResult.id, referrerId });
        emailsSent++;

        // Collect notification IDs for this referrer
        notificationIds.push(...group.notifications.map(n => n.id));

      } catch (error) {
        logStep("Error processing referrer", { 
          referrerId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // Mark all processed notifications as sent
    if (notificationIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("pending_commission_notifications")
        .update({ 
          sent_at: new Date().toISOString(),
          batch_id: batchId
        })
        .in("id", notificationIds);

      if (updateError) {
        logStep("Error marking notifications as sent", { error: updateError.message });
      } else {
        logStep("Marked notifications as sent", { count: notificationIds.length });
      }
    }

    // Auto-cleanup: Delete notifications older than 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const { data: deletedRecords, error: deleteError } = await supabaseAdmin
      .from("pending_commission_notifications")
      .delete()
      .not("sent_at", "is", null)
      .lt("sent_at", sixtyDaysAgo.toISOString())
      .select("id");

    if (deleteError) {
      logStep("Error cleaning up old notifications", { error: deleteError.message });
    } else {
      const deletedCount = deletedRecords?.length || 0;
      if (deletedCount > 0) {
        logStep("Cleaned up old notifications", { deletedCount, olderThan: sixtyDaysAgo.toISOString() });
      }
    }

    logStep("Digest processing complete", { emailsSent, notificationsProcessed: notificationIds.length });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Daily digest sent",
      emails_sent: emailsSent,
      notifications_processed: notificationIds.length,
      batch_id: batchId,
      old_records_cleaned: deletedRecords?.length || 0
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
