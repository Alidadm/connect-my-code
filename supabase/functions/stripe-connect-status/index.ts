import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Checking Stripe Connect status");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      throw new Error("Unauthorized");
    }

    // Get user's Stripe Connect ID
    const { data: privateProfile } = await supabaseClient
      .from("profiles_private")
      .select("stripe_connect_id")
      .eq("user_id", user.id)
      .single();

    if (!privateProfile?.stripe_connect_id) {
      return new Response(
        JSON.stringify({ 
          connected: false,
          status: "not_connected",
          message: "No Stripe account connected"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get account details
    const account = await stripe.accounts.retrieve(privateProfile.stripe_connect_id);

    const isComplete = account.details_submitted && account.payouts_enabled;
    
    logStep("Account status retrieved", { 
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled
    });

    return new Response(
      JSON.stringify({ 
        connected: true,
        status: isComplete ? "active" : "pending",
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        account_id: account.id,
        message: isComplete 
          ? "Stripe account is active and ready for payouts" 
          : "Stripe account setup is incomplete"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
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
