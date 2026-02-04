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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const { orderId, action } = await req.json();

    if (!orderId || !action) {
      throw new Error("Order ID and action are required");
    }

    // Get the order and its checkout session
    const { data: order, error: orderError } = await supabaseAdmin
      .from("ad_orders")
      .select("*, campaign:ad_campaigns(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (!order.stripe_checkout_session_id) {
      throw new Error("No payment session found for this order");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session to get the payment intent
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    
    if (!session.payment_intent) {
      throw new Error("No payment intent found");
    }

    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent.id;

    if (action === "capture") {
      // Capture the authorized payment
      await stripe.paymentIntents.capture(paymentIntentId);

      // Update order status
      await supabaseAdmin
        .from("ad_orders")
        .update({
          payment_status: "paid",
          status: "approved",
          stripe_payment_intent_id: paymentIntentId,
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // Activate the campaign
      if (order.campaign_id) {
        await supabaseAdmin
          .from("ad_campaigns")
          .update({ status: "active" })
          .eq("id", order.campaign_id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment captured and campaign activated" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "cancel") {
      // Cancel the authorized payment (release the hold)
      await stripe.paymentIntents.cancel(paymentIntentId);

      // Update order status
      await supabaseAdmin
        .from("ad_orders")
        .update({
          payment_status: "canceled",
          status: "rejected",
          reviewed_by: userData.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // Reject the campaign
      if (order.campaign_id) {
        await supabaseAdmin
          .from("ad_campaigns")
          .update({ status: "rejected" })
          .eq("id", order.campaign_id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment authorization canceled and campaign rejected" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      throw new Error("Invalid action. Use 'capture' or 'cancel'");
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in capture-ad-payment:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
