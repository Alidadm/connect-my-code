import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ exists: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if email exists in profiles_private
    const { data: privateData, error: privateError } = await supabaseAdmin
      .from("profiles_private")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1);

    if (privateError) {
      console.error("Error checking profiles_private:", privateError);
    }

    if (privateData && privateData.length > 0) {
      return new Response(JSON.stringify({ exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Also check auth.users using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
    });

    if (authError) {
      console.error("Error listing users:", authError);
    }

    // Check specifically for the email
    const { data: userByEmail } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = userByEmail?.users?.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase().trim()
    );

    return new Response(JSON.stringify({ 
      exists: emailExists || false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in check-email-exists:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage, exists: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 even on error to not block signup
    });
  }
});
