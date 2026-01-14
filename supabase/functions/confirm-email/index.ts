import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { token } = await req.json();
    if (!token) throw new Error("Token is required");

    logStep("Processing token");

    // Decode and validate token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      throw new Error("Invalid token format");
    }

    const { userId, email, exp } = tokenData;

    if (!userId || !email || !exp) {
      throw new Error("Invalid token data");
    }

    // Check expiration
    if (Date.now() > exp) {
      throw new Error("Token has expired");
    }

    logStep("Token valid, updating profile", { userId: userId.slice(0, 8) + "..." });

    // Update email_verified in profiles table
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", userId);

    if (updateError) {
      logStep("Update error", { error: updateError.message });
      throw new Error("Failed to verify email");
    }

    logStep("Email verified successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email verified successfully"
    }), {
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
