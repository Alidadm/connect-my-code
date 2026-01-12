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

    // Handle different event types
    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        // Subscription activated or renewed - update status
        const subscription = event.resource;
        const userId = subscription.custom_id;
        
        logStep("Processing subscription activation/renewal", { 
          subscriptionId: subscription.id,
          userId 
        });

        if (userId) {
          // Update subscription status in profiles
          await supabaseClient
            .from("profiles")
            .update({ subscription_status: "active" })
            .eq("user_id", userId);
          
          logStep("Updated subscription status to active");
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
                  const { error: commissionError } = await supabaseClient
                    .from("commissions")
                    .insert({
                      referrer_id: profile.referrer_id,
                      referred_user_id: userId,
                      amount: 5.00,
                      currency: "USD",
                      status: "pending",
                      payment_provider: "paypal",
                      provider_transfer_id: sale.id,
                    });

                  if (commissionError) {
                    logStep("Failed to create commission", { error: commissionError.message });
                  } else {
                    logStep("Commission created", { referrerId: profile.referrer_id });
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
          await supabaseClient
            .from("profiles")
            .update({ subscription_status: "inactive" })
            .eq("user_id", userId);
          
          logStep("Updated subscription status to inactive");
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
