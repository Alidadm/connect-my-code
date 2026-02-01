import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAIL-VERIFICATION-CODE] ${step}${detailsStr}`);
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
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

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

    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    logStep("Sending code to email", { email: email.replace(/(.{2}).*@/, "$1***@") });

    // Delete any existing codes for this user
    await supabaseAdmin
      .from("email_verification_codes")
      .delete()
      .eq("user_id", user.id);

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const { error: insertError } = await supabaseAdmin
      .from("email_verification_codes")
      .insert({
        user_id: user.id,
        email: email,
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) throw insertError;

    logStep("Verification code stored");

    // Get the app URL for the button link
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovableproject.com") || "https://dolphysn.com";
    const verifyUrl = `${appUrl.replace("/functions/v1", "")}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "DolphySN <noreply@dolphysn.com>",
      to: [email],
      subject: "Verify Your Email - DolphySN",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #1c76e6; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🐬 DolphySN</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Verify Your Email</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Welcome! Please use the verification code below to complete your profile setup:
              </p>
              <div style="background-color: #f0f9ff; border: 2px dashed #1c76e6; border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px;">Your verification code:</p>
                <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1c76e6; margin: 0; font-family: monospace;">${code}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0;">
                This code expires in <strong>10 minutes</strong>
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="background-color: #1c76e6; border-radius: 8px;">
                      <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #1c76e6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        Go to App &amp; Enter Code
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
                Copy the code above and enter it in the app
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your DolphySN verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nGo to the app to enter your code: ${verifyUrl}\n\nIf you didn't request this code, please ignore this email.`,
    });

    logStep("Email sent successfully", { id: emailResponse.data?.id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verification code sent",
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
