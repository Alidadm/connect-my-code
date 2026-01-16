import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { email, password } = await req.json();
    
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log(`Created auth user: ${userId}`);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, ""),
        display_name: email.split("@")[0],
        email_verified: true,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Create private profile
    const { error: privateError } = await supabaseAdmin
      .from("profiles_private")
      .insert({
        user_id: userId,
        email: email,
        payout_setup_completed: true,
      });

    if (privateError) {
      console.error("Private profile creation error:", privateError);
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin user created: ${email}`,
        userId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
