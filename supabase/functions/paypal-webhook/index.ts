import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-WEBHOOK] ${step}${detailsStr}`);
};

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"; // Use api-m.paypal.com for production

async function verifyWebhookSignature(
  accessToken: string,
  webhookId: string,
  body: string,
  headers: Headers
): Promise<boolean> {
  const verifyPayload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(verifyPayload),
  });

  if (!response.ok) {
    logStep("Webhook verification request failed", { status: response.status });
    return false;
  }

  const result = await response.json();
  return result.verification_status === "SUCCESS";
}

async function getPayPalAccessToken(clientId: string, secretKey: string): Promise<string> {
  const auth = btoa(`${clientId}:${secretKey}`);
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secretKey = Deno.env.get("PAYPAL_SECRET_KEY");
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    
    if (!clientId || !secretKey) {
      throw new Error("PayPal credentials not configured");
    }

    const body = await req.text();
    const event = JSON.parse(body);
    
    logStep("Event received", { type: event.event_type, id: event.id });

    // Verify webhook signature if webhook ID is configured
    if (webhookId) {
      const accessToken = await getPayPalAccessToken(clientId, secretKey);
      const isValid = await verifyWebhookSignature(accessToken, webhookId, body, req.headers);
      if (!isValid) {
        logStep("Webhook signature verification failed");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      logStep("Webhook signature verified");
    } else {
      logStep("Skipping signature verification (no webhook ID configured)");
    }

    // Initialize Supabase with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Helper function to get user email from auth
    async function getUserEmail(userId: string): Promise<string | null> {
      const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
      const user = authUsers?.users.find(u => u.id === userId);
      return user?.email || null;
    }

    // Helper function to get user name
    async function getUserName(userId: string): Promise<string> {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", userId)
        .single();
      
      return profile?.display_name || 
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
        "Member";
    }

    // Handle different event types
    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        // Subscription activated or renewed - update status
        const subscription = event.resource;
        const userId = subscription.custom_id;
        const isRenewal = event.event_type === "BILLING.SUBSCRIPTION.RENEWED";
        
        logStep("Processing subscription activation/renewal", { 
          subscriptionId: subscription.id,
          userId,
          isRenewal
        });

        if (userId) {
          // Make activation idempotent: only the FIRST caller that flips the status to active
          // should send the confirmation email. This prevents duplicate emails on webhook retries.
          const { data: activatedRows, error: activationError } = await supabaseClient
            .from("profiles")
            .update({ subscription_status: "active" })
            .eq("user_id", userId)
            .or("subscription_status.is.null,subscription_status.neq.active")
            .select("user_id");

          if (activationError) {
            logStep("Failed to set subscription status to active", { error: activationError.message });
          }

          const firstActivation = Array.isArray(activatedRows) && activatedRows.length > 0;
          const wasAlreadyActive = !firstActivation;

          logStep("Ensured subscription status is active", { firstActivation, wasAlreadyActive });

          // Auto-populate PayPal payout email from subscriber info (first activation only)
          if (firstActivation && subscription.subscriber?.email_address) {
            const subscriberEmail = subscription.subscriber.email_address;
            logStep("Auto-populating PayPal payout email from subscriber", { email: subscriberEmail });
            
            // Check if paypal_payout_email is already set
            const { data: privateProfile } = await supabaseClient
              .from("profiles_private")
              .select("paypal_payout_email, payout_setup_completed")
              .eq("user_id", userId)
              .single();
            
            // Only set if not already configured
            if (!privateProfile?.paypal_payout_email) {
              await supabaseClient
                .from("profiles_private")
                .update({ 
                  paypal_payout_email: subscriberEmail,
                  payout_setup_completed: true  // Mark as completed since PayPal is now set
                })
                .eq("user_id", userId);
              
              logStep("PayPal payout email auto-populated and payout setup marked complete", { email: subscriberEmail });
            } else {
              // PayPal email already set - also mark setup as complete if not already
              if (!privateProfile?.payout_setup_completed) {
                await supabaseClient
                  .from("profiles_private")
                  .update({ payout_setup_completed: true })
                  .eq("user_id", userId);
                logStep("Payout setup marked complete (PayPal email was already set)");
              } else {
                logStep("PayPal payout email already set, skipping auto-populate");
              }
            }
          }

          // Create or update subscription record
          const billingInfo = subscription.billing_info;
          const currentPeriodStart = billingInfo?.last_payment?.time 
            ? new Date(billingInfo.last_payment.time).toISOString()
            : new Date().toISOString();
          
          // Calculate period end (1 month from start)
          const periodEnd = new Date(currentPeriodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          // Check if subscription record already exists
          const { data: existingSub } = await supabaseClient
            .from("subscriptions")
            .select("id")
            .eq("provider_subscription_id", subscription.id)
            .single();

          if (existingSub) {
            // Update existing subscription
            await supabaseClient
              .from("subscriptions")
              .update({
                status: "active",
                current_period_start: currentPeriodStart,
                current_period_end: periodEnd.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingSub.id);
            
            logStep("Updated existing subscription record", { id: existingSub.id });
          } else {
            // Create new subscription record
            const { error: subError } = await supabaseClient
              .from("subscriptions")
              .insert({
                user_id: userId,
                status: "active",
                payment_provider: "paypal",
                provider_subscription_id: subscription.id,
                amount: 9.99,
                currency: "USD",
                current_period_start: currentPeriodStart,
                current_period_end: periodEnd.toISOString(),
              });

            if (subError) {
              logStep("Failed to create subscription record", { error: subError.message });
            } else {
              logStep("Created subscription record");
            }
          }

          // Get user email and name for notifications
          const userEmail = await getUserEmail(userId);
          const userName = await getUserName(userId);

          if (userEmail) {
            if (firstActivation) {
              // First activation - send confirmation email
              try {
                logStep("First activation detected; sending confirmation email", { email: userEmail });
                await fetch(`${supabaseUrl}/functions/v1/send-signup-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    email: userEmail,
                    name: userName,
                    userId: userId,
                  }),
                });
                logStep("Confirmation email sent");
              } catch (emailError) {
                logStep("Failed to send confirmation email", { error: String(emailError) });
              }
            } else if (isRenewal) {
              // Renewal - send renewal notification
              try {
                logStep("Renewal detected; sending renewal notification", { email: userEmail });
                await fetch(`${supabaseUrl}/functions/v1/send-renewal-notification`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    email: userEmail,
                    name: userName,
                    amount: 9.99,
                    currency: "USD",
                    nextBillingDate: periodEnd.toISOString(),
                  }),
                });
                logStep("Renewal notification sent");
              } catch (emailError) {
                logStep("Failed to send renewal notification", { error: String(emailError) });
              }
            }
          }
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Payment completed - create commission
        const sale = event.resource;
        const subscriptionId = sale.billing_agreement_id;
        
        logStep("Processing payment completed", { 
          saleId: sale.id,
          subscriptionId,
          amount: sale.amount?.total 
        });

        // Get subscription details to find user
        if (subscriptionId) {
          const accessToken = await getPayPalAccessToken(clientId, secretKey);
          const subResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (subResponse.ok) {
            const subscription = await subResponse.json();
            const userId = subscription.custom_id;

            if (userId) {
              // Get user's referrer
              const { data: profile } = await supabaseClient
                .from("profiles")
                .select("referrer_id")
                .eq("user_id", userId)
                .single();

              if (profile?.referrer_id) {
                // Check for duplicate commission
                const { data: existingCommission } = await supabaseClient
                  .from("commissions")
                  .select("id")
                  .eq("provider_transfer_id", sale.id)
                  .single();

                if (!existingCommission) {
                  // Create commission record ($5 fixed)
                  const { data: commission, error: commissionError } = await supabaseClient
                    .from("commissions")
                    .insert({
                      referrer_id: profile.referrer_id,
                      referred_user_id: userId,
                      amount: 5.00,
                      currency: "USD",
                      status: "pending",
                      payment_provider: "paypal",
                      provider_transfer_id: sale.id,
                    })
                    .select()
                    .single();

                  if (commissionError) {
                    logStep("Failed to create commission", { error: commissionError.message });
                  } else {
                    logStep("Commission created", { referrerId: profile.referrer_id });

                    // Get referred user's name for the notification
                    const { data: referredProfile } = await supabaseClient
                      .from("profiles")
                      .select("display_name, first_name")
                      .eq("user_id", userId)
                      .single();
                    
                    const referredUserName = referredProfile?.display_name || referredProfile?.first_name || null;

                    // Queue commission notification for daily digest instead of sending immediately
                    try {
                      await supabaseClient
                        .from("pending_commission_notifications")
                        .insert({
                          referrer_id: profile.referrer_id,
                          notification_type: "commission_earned",
                          amount: 5.00,
                          currency: "USD",
                          referred_user_name: referredUserName,
                          payment_provider: "paypal",
                        });
                      logStep("Commission earned notification queued for daily digest");
                    } catch (notifError) {
                      logStep("Failed to queue commission notification", { error: String(notifError) });
                    }
                  }
                } else {
                  logStep("Commission already exists for this sale");
                }
              } else {
                logStep("No referrer found for user", { userId });
              }
            }
          }
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        // Subscription ended
        const subscription = event.resource;
        const userId = subscription.custom_id;
        
        logStep("Processing subscription cancellation/expiry", { 
          subscriptionId: subscription.id,
          userId,
          status: event.event_type 
        });

        if (userId) {
          // Update profile status
          await supabaseClient
            .from("profiles")
            .update({ subscription_status: "inactive" })
            .eq("user_id", userId);
          
          logStep("Updated profile subscription status to inactive");

          // Update subscription record
          const canceledStatus = event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" 
            ? "canceled" 
            : event.event_type === "BILLING.SUBSCRIPTION.EXPIRED" 
              ? "expired" 
              : "suspended";

          // Get subscription end date from billing info
          const billingInfo = subscription.billing_info;
          const endDate = billingInfo?.next_billing_time 
            ? new Date(billingInfo.next_billing_time).toISOString()
            : new Date().toISOString();

          const { error: subError } = await supabaseClient
            .from("subscriptions")
            .update({
              status: canceledStatus,
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("provider_subscription_id", subscription.id);

          if (subError) {
            logStep("Failed to update subscription record", { error: subError.message });
          } else {
            logStep("Updated subscription record to " + canceledStatus);
          }

          // Send cancellation notification email
          const userEmail = await getUserEmail(userId);
          const userName = await getUserName(userId);

          if (userEmail) {
            try {
              logStep("Sending cancellation notification", { email: userEmail });
              await fetch(`${supabaseUrl}/functions/v1/send-cancellation-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                  email: userEmail,
                  name: userName,
                  endDate,
                }),
              });
              logStep("Cancellation notification sent");
            } catch (notifError) {
              logStep("Failed to send cancellation notification", { error: String(notifError) });
            }
          }
        }
        break;
      }

      case "PAYMENT.SALE.DENIED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        // Payment failed
        const resource = event.resource;
        const subscriptionId = resource.billing_agreement_id || resource.id;
        
        logStep("Processing payment failure", { 
          eventType: event.event_type,
          subscriptionId
        });

        if (subscriptionId) {
          // Get subscription details
          const accessToken = await getPayPalAccessToken(clientId, secretKey);
          const subResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (subResponse.ok) {
            const subscription = await subResponse.json();
            const userId = subscription.custom_id;

            if (userId) {
              const userEmail = await getUserEmail(userId);
              const userName = await getUserName(userId);

              if (userEmail) {
                try {
                  logStep("Sending payment failed notification", { email: userEmail });
                  await fetch(`${supabaseUrl}/functions/v1/send-payment-failed-notification`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${serviceRoleKey}`,
                    },
                    body: JSON.stringify({
                      email: userEmail,
                      name: userName,
                      amount: 9.99,
                      currency: "USD",
                      nextAttemptDate: null, // PayPal handles retries automatically
                    }),
                  });
                  logStep("Payment failed notification sent");
                } catch (notifError) {
                  logStep("Failed to send payment failed notification", { error: String(notifError) });
                }
              }
            }
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.event_type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
