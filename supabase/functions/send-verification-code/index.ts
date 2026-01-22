import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-VERIFICATION-CODE] ${step}${detailsStr}`);
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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

    const { phone } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    logStep("Sending code for phone", { phone: phone.slice(0, 4) + "****" });

    // Get user's email from profiles_private
    const { data: privateProfile, error: profileError } = await supabaseAdmin
      .from("profiles_private")
      .select("email")
      .eq("user_id", user.id)
      .single();

    let userEmail = user.email;
    if (privateProfile?.email) {
      userEmail = privateProfile.email;
    }

    if (!userEmail) {
      throw new Error("No email address found for user");
    }

    logStep("Found user email", { email: userEmail.slice(0, 3) + "***" });

    // Delete any existing codes for this user/phone
    await supabaseAdmin
      .from("phone_verification_codes")
      .delete()
      .eq("user_id", user.id);

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database (only accessible via service role)
    const { error: insertError } = await supabaseAdmin
      .from("phone_verification_codes")
      .insert({
        user_id: user.id,
        phone: phone,
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) throw insertError;

    logStep("Verification code stored");

    // Send code via email using Resend
    const maskedPhone = phone.slice(0, 4) + "****" + phone.slice(-2);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MemberHub <no-reply@resend.dev>",
        to: [userEmail],
        subject: `Your Phone Verification Code: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Phone Verification Code</h2>
            <p style="color: #666;">You are verifying the phone number: <strong>${maskedPhone}</strong></p>
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
              <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
              <h1 style="color: white; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
            </div>
            <p style="color: #888; font-size: 12px; text-align: center;">This code will expire in 10 minutes.</p>
            <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
        text: `Your phone verification code is: ${code}. This code will expire in 10 minutes. If you didn't request this, please ignore this email.`,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      logStep("Resend API error", { status: emailResponse.status, error: errorText });
      throw new Error(`Failed to send email: ${errorText}`);
    }

    logStep("Verification code sent via email");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verification code sent to your email",
      expiresIn: 600 // 10 minutes in seconds
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
