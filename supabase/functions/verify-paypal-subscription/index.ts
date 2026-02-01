import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYPAL-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

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
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getSubscriptionDetails(accessToken: string, subscriptionId: string) {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get subscription details: ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secretKey = Deno.env.get("PAYPAL_SECRET_KEY");
    
    if (!clientId || !secretKey) {
      throw new Error("PayPal credentials not configured");
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get PayPal subscription ID from profiles_private
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: privateProfile } = await supabaseAdmin
      .from("profiles_private")
      .select("paypal_customer_id, email")
      .eq("user_id", user.id)
      .single();

    if (!privateProfile?.paypal_customer_id) {
      logStep("No PayPal subscription found for user");
      return new Response(JSON.stringify({ verified: false, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionId = privateProfile.paypal_customer_id;
    logStep("Found subscription ID", { subscriptionId });

    // Get PayPal access token and verify subscription
    const accessToken = await getPayPalAccessToken(clientId, secretKey);
    const subscription = await getSubscriptionDetails(accessToken, subscriptionId);
    
    logStep("Subscription status from PayPal", { status: subscription.status });

    // Check if subscription is active
    if (subscription.status === "ACTIVE" || subscription.status === "APPROVED") {
      // Update user profile
      await supabaseAdmin
        .from("profiles")
        .update({ 
          subscription_status: "active"
        })
        .eq("user_id", user.id);

      logStep("Updated user profile to active");

      // Create/update subscription record
      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider_subscription_id", subscriptionId)
        .single();

      if (!existingSub) {
        await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: user.id,
            status: "active",
            payment_provider: "paypal",
            provider_subscription_id: subscriptionId,
            amount: 9.99,
            currency: "USD",
            current_period_start: now,
            current_period_end: periodEnd.toISOString(),
          });
        logStep("Created subscription record");
      }

      // Get user profile for email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const userName = profile?.display_name || 
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
        "Member";

      // IMPORTANT:
      // Do NOT send the signup verification email from here.
      // The PayPal webhook sends it on first activation; sending here causes duplicates.

      return new Response(JSON.stringify({ 
        verified: true, 
        status: subscription.status,
        emailSent: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Subscription not yet active
    return new Response(JSON.stringify({ 
      verified: false, 
      status: subscription.status,
      reason: "not_active" 
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
