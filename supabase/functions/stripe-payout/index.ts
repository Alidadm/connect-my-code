import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payout request received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      logStep("User is not admin", { userId: user.id });
      throw new Error("Admin access required");
    }

    const { withdrawal_request_id } = await req.json();
    
    if (!withdrawal_request_id) {
      throw new Error("withdrawal_request_id is required");
    }

    logStep("Processing withdrawal", { requestId: withdrawal_request_id });

    // Fetch the withdrawal request
    const { data: request, error: fetchError } = await supabaseClient
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawal_request_id)
      .single();

    if (fetchError || !request) {
      throw new Error("Withdrawal request not found");
    }

    if (request.status !== "approved") {
      throw new Error("Withdrawal request must be approved before payout");
    }

    if (request.payout_method !== "stripe") {
      throw new Error("This request is not for Stripe payout");
    }

    // Get user's Stripe Connect ID
    const { data: privateProfile } = await supabaseClient
      .from("profiles_private")
      .select("stripe_connect_id")
      .eq("user_id", request.user_id)
      .single();

    if (!privateProfile?.stripe_connect_id) {
      throw new Error("User does not have a connected Stripe account");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Verify the connected account is active
    const account = await stripe.accounts.retrieve(privateProfile.stripe_connect_id);
    
    if (!account.payouts_enabled) {
      throw new Error("User's Stripe account is not fully set up for payouts");
    }

    // Update status to processing
    await supabaseClient
      .from("withdrawal_requests")
      .update({ 
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", withdrawal_request_id);

    // Create a transfer to the connected account
    const amountInCents = Math.round(request.amount * 100);
    
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: request.currency || "usd",
      destination: privateProfile.stripe_connect_id,
      description: `DolphySN Commission Payout - Request ${withdrawal_request_id}`,
      metadata: {
        withdrawal_request_id,
        user_id: request.user_id,
      },
    });

    logStep("Transfer created", { transferId: transfer.id, amount: transfer.amount });

    // Update withdrawal request with transfer ID
    await supabaseClient
      .from("withdrawal_requests")
      .update({
        status: "completed",
        provider_payout_id: transfer.id,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", withdrawal_request_id);

    // Mark associated commissions as paid
    await supabaseClient
      .from("commissions")
      .update({ 
        status: "paid", 
        paid_at: new Date().toISOString(),
        provider_transfer_id: transfer.id
      })
      .eq("referrer_id", request.user_id)
      .eq("status", "pending");
    
    logStep("Marked commissions as paid", { userId: request.user_id });

    // Send payout completed email notification
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      await fetch(`${supabaseUrl}/functions/v1/send-commission-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          referrer_id: request.user_id,
          type: "payout_completed",
          amount: request.amount,
          currency: request.currency || "USD",
          payout_method: "stripe",
        }),
      });
      logStep("Payout notification email sent");
    } catch (notifError) {
      logStep("Failed to send payout notification", { error: String(notifError) });
    }

    logStep("Payout completed successfully", { 
      transferId: transfer.id, 
      amount: request.amount,
      connectedAccount: privateProfile.stripe_connect_id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer_id: transfer.id,
        status: "completed"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 400,
      }
    );
  }
});
