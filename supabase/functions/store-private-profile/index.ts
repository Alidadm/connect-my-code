import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-PRIVATE-PROFILE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role to bypass RLS on profiles_private
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    const { signup_ip_address, stripe_customer_id, paypal_customer_id } = await req.json();

    // Check if record exists
    const { data: existing } = await supabaseAdmin
      .from("profiles_private")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing record
      const updateData: Record<string, string> = {};
      if (signup_ip_address) updateData.signup_ip_address = signup_ip_address;
      if (stripe_customer_id) updateData.stripe_customer_id = stripe_customer_id;
      if (paypal_customer_id) updateData.paypal_customer_id = paypal_customer_id;

      const { error: updateError } = await supabaseAdmin
        .from("profiles_private")
        .update(updateData)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
      logStep("Updated profiles_private", { userId: user.id });
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from("profiles_private")
        .insert({
          user_id: user.id,
          signup_ip_address,
          stripe_customer_id,
          paypal_customer_id,
        });

      if (insertError) throw insertError;
      logStep("Inserted profiles_private", { userId: user.id });
    }

    return new Response(JSON.stringify({ success: true }), {
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
