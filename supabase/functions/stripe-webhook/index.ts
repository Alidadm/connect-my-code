import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    
    // Verify and construct the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Initialize Supabase with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle invoice.paid event for commission distribution
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      
      logStep("Processing invoice.paid", { 
        invoiceId: invoice.id, 
        customerId: invoice.customer,
        amountPaid: invoice.amount_paid 
      });

      // Get customer email to find the user
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) {
        logStep("No customer ID found on invoice");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) {
        logStep("Customer deleted or no email", { customerId });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Found customer", { email: customer.email });

      // Find the user profile by email (match via auth.users)
      const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
      if (authError) {
        logStep("Error fetching auth users", { error: authError.message });
        throw new Error(`Failed to fetch users: ${authError.message}`);
      }

      const user = authUsers.users.find(u => u.email?.toLowerCase() === customer.email?.toLowerCase());
      if (!user) {
        logStep("No user found for email", { email: customer.email });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Found user", { userId: user.id });

      // Get user's profile to check for referrer
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("referrer_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.referrer_id) {
        logStep("No referrer found for user", { userId: user.id, error: profileError?.message });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Found referrer", { referrerId: profile.referrer_id });

      // Calculate commission: $5 (500 cents) or half of the subscription amount
      const subscriptionAmount = invoice.amount_paid; // in cents
      const commissionAmount = 500; // $5 fixed commission (500 cents)
      
      logStep("Calculating commission", { 
        subscriptionAmount, 
        commissionAmount,
        currency: invoice.currency 
      });

      // Check if we already processed this invoice (prevent duplicates)
      const invoiceId = invoice.id;
      const { data: existingCommission } = await supabaseClient
        .from("commissions")
        .select("id")
        .eq("provider_transfer_id", invoiceId)
        .single();

      if (existingCommission) {
        logStep("Commission already exists for this invoice", { invoiceId });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Create commission record
      const { data: commission, error: commissionError } = await supabaseClient
        .from("commissions")
        .insert({
          referrer_id: profile.referrer_id,
          referred_user_id: user.id,
          amount: commissionAmount / 100, // Store as dollars (5.00)
          currency: invoice.currency?.toUpperCase() || "USD",
          status: "pending",
          payment_provider: "stripe",
          provider_transfer_id: invoiceId,
        })
        .select()
        .single();

      if (commissionError) {
        logStep("Failed to create commission", { error: commissionError.message });
        throw new Error(`Failed to create commission: ${commissionError.message}`);
      }

      logStep("Commission created successfully", { 
        commissionId: commission.id,
        amount: commissionAmount / 100,
        referrerId: profile.referrer_id 
      });

      // TODO: Implement automatic payout via Stripe Connect or manual tracking
      // For now, commissions are tracked and can be paid out manually
    }

    // Handle other events as needed
    if (event.type === "customer.subscription.deleted") {
      logStep("Subscription canceled", { subscription: (event.data.object as Stripe.Subscription).id });
      // Could update profile subscription_status here
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
