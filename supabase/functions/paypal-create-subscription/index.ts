import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

const base64UrlEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlEncodeString = (value: string) =>
  base64UrlEncode(new TextEncoder().encode(value));

const hmacSha256Base64Url = async (data: string, secret: string) => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
};

// PayPal API base URLs
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"; // Use api-m.paypal.com for production

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

async function getOrCreateProduct(accessToken: string): Promise<string> {
  logStep("Checking for existing product...");
  
  // List existing products
  const listResponse = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products?page_size=20`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (listResponse.ok) {
    const products = await listResponse.json();
    const existingProduct = products.products?.find((p: any) => p.name === "DolphySN Premium" || p.name === "WeShare Premium");
    if (existingProduct) {
      logStep("Found existing product", { productId: existingProduct.id });
      return existingProduct.id;
    }
  }

  // Create new product
  logStep("Creating new product...");
  const createResponse = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "DolphySN Premium",
      description: "Monthly premium membership for DolphySN social platform",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create PayPal product: ${error}`);
  }

  const product = await createResponse.json();
  logStep("Product created", { productId: product.id });
  return product.id;
}

async function getOrCreatePlan(accessToken: string, productId: string): Promise<string> {
  logStep("Checking for existing plan...");
  
  // List existing plans for this product
  const listResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans?product_id=${productId}&page_size=20`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (listResponse.ok) {
    const plans = await listResponse.json();
    const existingPlan = plans.plans?.find((p: any) => 
      (p.name === "DolphySN Monthly Premium" || p.name === "WeShare Monthly Premium") && p.status === "ACTIVE"
    );
    if (existingPlan) {
      logStep("Found existing plan", { planId: existingPlan.id });
      return existingPlan.id;
    }
  }

  // Create new plan
  logStep("Creating new plan...");
  const createResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      name: "DolphySN Monthly Premium",
      description: "$9.99/month subscription for DolphySN Premium access",
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // Unlimited cycles
          pricing_scheme: {
            fixed_price: {
              value: "9.99",
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD",
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create PayPal plan: ${error}`);
  }

  const plan = await createResponse.json();
  logStep("Plan created", { planId: plan.id });
  return plan.id;
}

async function createSubscription(
  accessToken: string,
  planId: string,
  userId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  logStep("Creating subscription...", { planId, userId });

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId, // Store user ID for webhook processing
      application_context: {
        brand_name: "DolphySN",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal subscription: ${error}`);
  }

  const subscription = await response.json();
  const approvalUrl = subscription.links?.find((l: any) => l.rel === "approve")?.href;

  if (!approvalUrl) {
    throw new Error("No approval URL in PayPal subscription response");
  }

  logStep("Subscription created", { subscriptionId: subscription.id });
  return { subscriptionId: subscription.id, approvalUrl };
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
    logStep("PayPal credentials verified");

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

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(clientId, secretKey);
    logStep("PayPal access token obtained");

    // Get or create product and plan
    const productId = await getOrCreateProduct(accessToken);
    const planId = await getOrCreatePlan(accessToken, productId);

    // Create subscription
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create a short-lived signed state token so /verify-email can resend even if the auth session isn't restored.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

    const payloadB64 = base64UrlEncodeString(
      JSON.stringify({ uid: user.id, exp: Date.now() + 60 * 60 * 1000 })
    );
    const sigB64 = await hmacSha256Base64Url(payloadB64, serviceRoleKey);
    const state = `${payloadB64}.${sigB64}`;

    const { subscriptionId, approvalUrl } = await createSubscription(
      accessToken,
      planId,
      user.id,
      `${origin}/verify-email?checkout=success&provider=paypal&state=${encodeURIComponent(state)}`,
      `${origin}/pricing?checkout=canceled`
    );

    // Store PayPal subscription ID in profiles_private
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: existingPrivate } = await supabaseAdmin
      .from("profiles_private")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingPrivate) {
      await supabaseAdmin
        .from("profiles_private")
        .update({ paypal_customer_id: subscriptionId })
        .eq("user_id", user.id);
    } else {
      await supabaseAdmin
        .from("profiles_private")
        .insert({ user_id: user.id, paypal_customer_id: subscriptionId });
    }
    logStep("Stored PayPal subscription ID in profiles_private");

    return new Response(JSON.stringify({ url: approvalUrl, subscriptionId }), {
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
