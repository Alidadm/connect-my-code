import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { campaignId, amount, guestEmail, guestName } = await req.json();

    if (!campaignId || !amount) {
      throw new Error("Campaign ID and amount are required");
    }

    // Get user if authenticated
    let userEmail = guestEmail;
    let userId = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email;
      }
    }

    if (!userEmail) {
      throw new Error("Email is required for checkout");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://dolphysn.com";

    // Create checkout session with payment_intent_data for manual capture (authorization hold)
    // This authorizes the card but doesn't charge until admin captures the payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Ad Campaign",
              description: `Campaign ID: ${campaignId.slice(0, 8)} - Payment will be held until approval`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // IMPORTANT: Use manual capture - this authorizes but doesn't charge
      payment_intent_data: {
        capture_method: "manual",
        metadata: {
          campaign_id: campaignId,
          user_id: userId || "",
          guest_email: guestEmail || "",
          guest_name: guestName || "",
        },
      },
      success_url: `${origin}/ads?success=true&campaign=${campaignId}`,
      cancel_url: `${origin}/ads?canceled=true`,
      metadata: {
        campaign_id: campaignId,
        user_id: userId || "",
        guest_email: guestEmail || "",
        guest_name: guestName || "",
      },
    });

    // Create or update order record
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if there's an existing order for this campaign
    const { data: existingOrder } = await supabaseAdmin
      .from("ad_orders")
      .select("id")
      .eq("campaign_id", campaignId)
      .single();

    if (existingOrder) {
      // Update existing order with checkout session
      await supabaseAdmin
        .from("ad_orders")
        .update({
          amount: amount,
          stripe_checkout_session_id: session.id,
          payment_status: "authorized_pending", // Card is authorized, awaiting admin approval
        })
        .eq("id", existingOrder.id);
    } else {
      // Create new order
      await supabaseAdmin.from("ad_orders").insert({
        campaign_id: campaignId,
        user_id: userId,
        guest_email: guestEmail,
        guest_name: guestName,
        amount: amount,
        stripe_checkout_session_id: session.id,
        payment_status: "authorized_pending",
        status: "pending_review",
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating ad checkout:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
