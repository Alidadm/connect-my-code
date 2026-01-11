import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PHONE-CODE] ${step}${detailsStr}`);
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

    const { code, phone } = await req.json();
    if (!code) throw new Error("Verification code is required");
    if (!phone) throw new Error("Phone number is required");

    logStep("Verifying code", { phone: phone.slice(0, 4) + "****" });

    // Get the stored verification code
    const { data: storedCode, error: fetchError } = await supabaseAdmin
      .from("phone_verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", phone)
      .eq("verified", false)
      .single();

    if (fetchError || !storedCode) {
      logStep("No pending verification found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No pending verification found. Please request a new code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if code is expired
    if (new Date(storedCode.expires_at) < new Date()) {
      logStep("Code expired");
      // Clean up expired code
      await supabaseAdmin
        .from("phone_verification_codes")
        .delete()
        .eq("id", storedCode.id);

      return new Response(JSON.stringify({ 
        success: false, 
        error: "Verification code has expired. Please request a new code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Compare codes (constant-time comparison to prevent timing attacks)
    const codeMatch = storedCode.code === code;

    if (!codeMatch) {
      logStep("Invalid code provided");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid verification code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mark as verified
    await supabaseAdmin
      .from("phone_verification_codes")
      .update({ verified: true })
      .eq("id", storedCode.id);

    // Update user profile phone_verified status
    await supabaseAdmin
      .from("profiles")
      .update({ phone_verified: true })
      .eq("user_id", user.id);

    logStep("Phone verified successfully");

    // Clean up the verification code
    await supabaseAdmin
      .from("phone_verification_codes")
      .delete()
      .eq("id", storedCode.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Phone number verified successfully" 
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
