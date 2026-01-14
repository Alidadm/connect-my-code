import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARDING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting Stripe Connect onboarding");

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

    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if user already has a Stripe Connect account
    const { data: privateProfile } = await supabaseClient
      .from("profiles_private")
      .select("stripe_connect_id, email")
      .eq("user_id", user.id)
      .single();

    let accountId = privateProfile?.stripe_connect_id;

    if (accountId) {
      logStep("Existing Connect account found", { accountId });
      
      // Check account status
      const account = await stripe.accounts.retrieve(accountId);
      
      if (account.details_submitted) {
        // Account is already fully onboarded
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "complete",
            message: "Your Stripe account is already connected and active"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    } else {
      // Create new Express account
      logStep("Creating new Stripe Connect Express account");
      
      const account = await stripe.accounts.create({
        type: "express",
        email: privateProfile?.email || user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          supabase_user_id: user.id,
        },
      });

      accountId = account.id;
      logStep("Created Stripe Connect account", { accountId });

      // Store the account ID
      await supabaseClient
        .from("profiles_private")
        .update({ stripe_connect_id: accountId })
        .eq("user_id", user.id);
    }

    // Get the origin from request or use default
    const requestBody = await req.json().catch(() => ({}));
    const origin = requestBody.origin || "https://dolphysn.com";

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/commissions?stripe_connect=refresh`,
      return_url: `${origin}/commissions?stripe_connect=success`,
      type: "account_onboarding",
    });

    logStep("Created account link", { url: accountLink.url });

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: accountLink.url,
        account_id: accountId
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
