import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-EMAIL-CODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
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

    const { code, email } = await req.json();
    if (!code) throw new Error("Verification code is required");
    if (!email) throw new Error("Email is required");

    logStep("Verifying code", { email: email.replace(/(.{2}).*@/, "$1***@") });

    // Get the stored code
    const { data: storedCode, error: fetchError } = await supabaseAdmin
      .from("email_verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !storedCode) {
      logStep("Invalid or expired code");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid or expired verification code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mark code as verified
    await supabaseAdmin
      .from("email_verification_codes")
      .update({ verified: true })
      .eq("id", storedCode.id);

    // Update the user's email_verified status in profiles
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
    }

    // Also update the email in profiles_private if needed
    const { data: existingPrivate } = await supabaseAdmin
      .from("profiles_private")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingPrivate) {
      await supabaseAdmin
        .from("profiles_private")
        .update({ email: email })
        .eq("user_id", user.id);
    } else {
      await supabaseAdmin
        .from("profiles_private")
        .insert({ user_id: user.id, email: email });
    }

    // Delete all codes for this user (cleanup)
    await supabaseAdmin
      .from("email_verification_codes")
      .delete()
      .eq("user_id", user.id);

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
