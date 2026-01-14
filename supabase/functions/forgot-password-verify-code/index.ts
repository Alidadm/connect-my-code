import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FORGOT-PASSWORD-VERIFY-CODE] ${step}${detailsStr}`);
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

    const { code, email } = await req.json();
    if (!code) throw new Error("Verification code is required");
    if (!email) throw new Error("Email is required");

    logStep("Verifying code", { email: email.slice(0, 3) + "***" });

    // Get the stored reset code (phone column stores email for this flow)
    const { data: storedCode, error: fetchError } = await supabaseAdmin
      .from("password_reset_codes")
      .select("*")
      .eq("phone", email.toLowerCase().trim())
      .eq("verified", false)
      .single();

    if (fetchError || !storedCode) {
      logStep("No pending reset found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No pending password reset found. Please request a new code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if code is expired
    if (new Date(storedCode.expires_at) < new Date()) {
      logStep("Code expired");
      await supabaseAdmin
        .from("password_reset_codes")
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

    // Compare codes
    if (storedCode.code !== code) {
      logStep("Invalid code provided");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid verification code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mark as verified - this creates a "token" for password reset
    const resetToken = crypto.randomUUID();
    await supabaseAdmin
      .from("password_reset_codes")
      .update({ 
        verified: true,
        reset_token: resetToken,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // Extended 15 min for password reset
      })
      .eq("id", storedCode.id);

    logStep("Code verified successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Code verified successfully",
      resetToken: resetToken,
      userId: storedCode.user_id
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
