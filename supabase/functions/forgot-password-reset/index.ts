import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FORGOT-PASSWORD-RESET] ${step}${detailsStr}`);
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

    const { resetToken, newPassword } = await req.json();
    if (!resetToken) throw new Error("Reset token is required");
    if (!newPassword) throw new Error("New password is required");

    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Password must be at least 8 characters long." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUppercase || !hasSymbol) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Password must contain at least one uppercase letter and one symbol." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Validating reset token");

    // Find the verified reset code with this token
    const { data: resetData, error: fetchError } = await supabaseAdmin
      .from("password_reset_codes")
      .select("*")
      .eq("reset_token", resetToken)
      .eq("verified", true)
      .single();

    if (fetchError || !resetData) {
      logStep("Invalid or expired reset token");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid or expired reset link. Please request a new code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      logStep("Token expired");
      await supabaseAdmin
        .from("password_reset_codes")
        .delete()
        .eq("id", resetData.id);

      return new Response(JSON.stringify({ 
        success: false, 
        error: "Reset link has expired. Please request a new code." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resetData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      logStep("Failed to update password", { error: updateError.message });
      throw updateError;
    }

    logStep("Password updated successfully");

    // Clean up the reset code
    await supabaseAdmin
      .from("password_reset_codes")
      .delete()
      .eq("id", resetData.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Password has been reset successfully. You can now log in with your new password."
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
