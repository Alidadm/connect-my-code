import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FORGOT-PASSWORD-SEND-CODE] ${step}${detailsStr}`);
};

// Generate a 6-digit code
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { phone } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    logStep("Looking up user by phone", { phone: phone.slice(0, 4) + "****" });

    // Find user by phone number in profiles_private
    const { data: privateProfile, error: lookupError } = await supabaseAdmin
      .from("profiles_private")
      .select("user_id")
      .eq("phone", phone)
      .single();

    if (lookupError || !privateProfile) {
      logStep("Phone number not found");
      // Return success anyway to prevent phone enumeration attacks
      return new Response(JSON.stringify({ 
        success: true, 
        message: "If this phone number is registered, you will receive a verification code.",
        expiresIn: 600
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const userId = privateProfile.user_id;
    logStep("User found", { userId: userId.slice(0, 8) + "..." });

    // Delete any existing password reset codes for this user
    await supabaseAdmin
      .from("password_reset_codes")
      .delete()
      .eq("user_id", userId);

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_codes")
      .insert({
        user_id: userId,
        phone: phone,
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) throw insertError;

    logStep("Reset code stored");

    // TODO: Integrate with Twilio/SMS provider to actually send the code
    // For now, we just store it and log for development
    console.log(`[DEV ONLY] Password reset code for ${phone}: ${code}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verification code sent",
      expiresIn: 600
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
