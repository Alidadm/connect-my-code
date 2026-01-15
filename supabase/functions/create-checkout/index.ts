import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Store/update Stripe customer ID in profiles_private (service role bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      // Upsert to profiles_private
      const { data: existingPrivate } = await supabaseAdmin
        .from("profiles_private")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (existingPrivate) {
        await supabaseAdmin
          .from("profiles_private")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      } else {
        await supabaseAdmin
          .from("profiles_private")
          .insert({ user_id: user.id, stripe_customer_id: customerId });
      }
      logStep("Stored Stripe customer ID in profiles_private");
    } else {
      logStep("No existing customer, will create new");
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    // TESTING MODE: Using daily billing interval (change to 'month' for production)
    const TESTING_MODE = true;
    const billingInterval = TESTING_MODE ? 'day' : 'month';
    logStep("Billing mode", { testing: TESTING_MODE, interval: billingInterval });

    // Create or retrieve the test product
    let product;
    const products = await stripe.products.list({ limit: 1, active: true });
    const existingProduct = products.data.find((p: { name: string }) => p.name === "DolphySN Premium");
    
    if (existingProduct) {
      product = existingProduct;
      logStep("Using existing product", { productId: product.id });
    } else {
      product = await stripe.products.create({
        name: "DolphySN Premium",
        description: "Premium subscription with full access",
      });
      logStep("Created new product", { productId: product.id });
    }

    // Create a price with the appropriate interval
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 999, // $9.99
      currency: "usd",
      recurring: {
        interval: billingInterval,
      },
    });
    logStep("Created price", { priceId: price.id, interval: billingInterval });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      metadata: {
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
