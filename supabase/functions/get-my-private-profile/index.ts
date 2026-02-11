import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client and validate JWT using getClaims
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT validation failed:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role to fetch the user's own private profile
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Retry logic for transient network errors
    let data = null;
    let lastError = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: profileData, error } = await supabaseAdmin
        .from("profiles_private")
        .select("email, phone, birthday, paypal_payout_email, payout_setup_completed, stripe_connect_id, wise_email, wise_account_id, payoneer_email, payoneer_account_id, preferred_payout_method")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error) {
        data = profileData;
        break;
      }
      
      // If it's a "not found" error, that's fine
      if (error.code === "PGRST116") {
        data = null;
        break;
      }
      
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }

    if (lastError && !data) {
      console.error("Error fetching private profile after retries:", lastError);
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return data directly (not wrapped) for easier consumption
    return new Response(JSON.stringify(data || {}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
