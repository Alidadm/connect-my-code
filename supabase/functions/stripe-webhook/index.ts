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
    
    // Verify and construct the event (must use async version in Deno)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
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

      // Update profile subscription status
      await supabaseClient
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("user_id", user.id);
      
      logStep("Updated profile subscription status to active");

      // Create or update subscription record
      const stripeSubscriptionId = invoice.subscription as string;
      if (stripeSubscriptionId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        const { data: existingSub } = await supabaseClient
          .from("subscriptions")
          .select("id")
          .eq("provider_subscription_id", stripeSubscriptionId)
          .single();

        if (existingSub) {
          // Update existing subscription
          await supabaseClient
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);
          
          logStep("Updated existing subscription record", { id: existingSub.id });
        } else {
          // Create new subscription record
          const { error: subError } = await supabaseClient
            .from("subscriptions")
            .insert({
              user_id: user.id,
              status: "active",
              payment_provider: "stripe",
              provider_subscription_id: stripeSubscriptionId,
              amount: invoice.amount_paid / 100, // Convert cents to dollars
              currency: invoice.currency?.toUpperCase() || "USD",
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            });

          if (subError) {
            logStep("Failed to create subscription record", { error: subError.message });
          } else {
            logStep("Created subscription record");
          }
        }
      }

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

      // Get referred user's name for the notification
      const { data: referredProfile } = await supabaseClient
        .from("profiles")
        .select("display_name, first_name")
        .eq("user_id", user.id)
        .single();
      
      const referredUserName = referredProfile?.display_name || referredProfile?.first_name || null;

      // AUTO-PAY: Check if auto-payout is enabled globally
      const { data: autoPayoutSetting } = await supabaseClient
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "auto_payout_enabled")
        .single();
      
      const autoPayoutEnabled = autoPayoutSetting?.setting_value !== false && 
                                 autoPayoutSetting?.setting_value !== "false";
      
      logStep("Auto-payout setting", { enabled: autoPayoutEnabled });

      // Check if referrer has Stripe Connect and transfer instantly (if auto-payout enabled)
      const { data: referrerPrivate } = await supabaseClient
        .from("profiles_private")
        .select("stripe_connect_id")
        .eq("user_id", profile.referrer_id)
        .single();

      let autoPaidSuccessfully = false;

      if (autoPayoutEnabled && referrerPrivate?.stripe_connect_id) {
        logStep("Referrer has Stripe Connect and auto-payout enabled, attempting auto-payout", { 
          connectId: referrerPrivate.stripe_connect_id 
        });

        try {
          // Verify the connected account can receive payouts
          const connectedAccount = await stripe.accounts.retrieve(referrerPrivate.stripe_connect_id);
          
          if (connectedAccount.payouts_enabled) {
            // Create instant transfer to connected account
            const transfer = await stripe.transfers.create({
              amount: commissionAmount, // in cents (500 = $5)
              currency: invoice.currency || "usd",
              destination: referrerPrivate.stripe_connect_id,
              description: `DolphySN Auto-Payout - Commission for referral`,
              metadata: {
                commission_id: commission.id,
                referrer_id: profile.referrer_id,
                referred_user_id: user.id,
              },
            });

            logStep("Auto-payout transfer created", { 
              transferId: transfer.id, 
              amount: commissionAmount / 100 
            });

            // Update commission to paid status
            await supabaseClient
              .from("commissions")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                provider_transfer_id: transfer.id,
              })
              .eq("id", commission.id);

            logStep("Commission marked as paid via auto-payout");
            autoPaidSuccessfully = true;

            // Send payout completed notification
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              await fetch(`${supabaseUrl}/functions/v1/send-commission-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  referrer_id: profile.referrer_id,
                  type: "payout_completed",
                  amount: commissionAmount / 100,
                  currency: invoice.currency?.toUpperCase() || "USD",
                  referred_user_name: referredUserName,
                  payout_method: "stripe",
                }),
              });
              logStep("Payout completed notification sent");
            } catch (notifError) {
              logStep("Failed to send payout notification", { error: String(notifError) });
            }
          } else {
            logStep("Referrer's Stripe account not ready for payouts, commission remains pending");
          }
        } catch (transferError) {
          logStep("Auto-payout failed, commission remains pending", { 
            error: transferError instanceof Error ? transferError.message : String(transferError) 
          });
          // Commission stays as "pending" - can be paid manually later
        }
      } else if (!autoPayoutEnabled) {
        logStep("Auto-payout is disabled globally, commission remains pending for manual payout");
      } else {
        logStep("Referrer has no Stripe Connect, commission remains pending for manual payout");
      }

      // Send commission earned notification (if not auto-paid, they need to know they earned it)
      if (!autoPaidSuccessfully) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          await fetch(`${supabaseUrl}/functions/v1/send-commission-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              referrer_id: profile.referrer_id,
              type: "commission_earned",
              amount: commissionAmount / 100,
              currency: invoice.currency?.toUpperCase() || "USD",
              referred_user_name: referredUserName,
            }),
          });
          logStep("Commission earned notification sent");
        } catch (notifError) {
          logStep("Failed to send commission notification", { error: String(notifError) });
        }
      }
    }

    // Handle subscription deleted/canceled
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription canceled", { subscriptionId: subscription.id });
      
      // Update subscription record
      const { error: subError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", subscription.id);

      if (subError) {
        logStep("Failed to update subscription record", { error: subError.message });
      } else {
        logStep("Updated subscription record to canceled");
      }

      // Get user ID from subscription metadata or customer
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
          const user = authUsers?.users.find(u => u.email?.toLowerCase() === customer.email?.toLowerCase());
          
          if (user) {
            await supabaseClient
              .from("profiles")
              .update({ subscription_status: "inactive" })
              .eq("user_id", user.id);
            
            logStep("Updated profile subscription status to inactive", { userId: user.id });
          }
        }
      }
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
