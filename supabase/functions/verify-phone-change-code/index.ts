import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PHONE-CHANGE-CODE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication error");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { code } = await req.json();
    if (!code) throw new Error("Verification code is required");

    const { data: storedCode, error: fetchError } = await supabaseAdmin
      .from("phone_verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !storedCode) {
      logStep("Invalid or expired code");
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired verification code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mark as verified
    await supabaseAdmin
      .from("phone_verification_codes")
      .update({ verified: true })
      .eq("id", storedCode.id);

    // Update profiles_private with new phone
    const { data: existingPrivate } = await supabaseAdmin
      .from("profiles_private")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingPrivate) {
      await supabaseAdmin
        .from("profiles_private")
        .update({ phone: storedCode.phone })
        .eq("user_id", user.id);
    } else {
      await supabaseAdmin
        .from("profiles_private")
        .insert({ user_id: user.id, phone: storedCode.phone });
    }

    // Mark phone as verified in profiles
    await supabaseAdmin
      .from("profiles")
      .update({ phone_verified: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Cleanup codes
    await supabaseAdmin
      .from("phone_verification_codes")
      .delete()
      .eq("user_id", user.id);

    logStep("Phone updated & verified");

    return new Response(JSON.stringify({ success: true, newPhone: storedCode.phone }), {
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
