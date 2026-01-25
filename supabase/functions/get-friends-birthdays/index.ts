import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-FRIENDS-BIRTHDAYS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Not authenticated", friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Session expired", friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Use service role to bypass RLS on profiles_private
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get today's date in MM-DD format for birthday matching
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const birthdayPattern = `%-${todayMonth}-${todayDay}`;

    logStep("Birthday pattern", { pattern: birthdayPattern });

    // Get accepted friendships
    const { data: friendships, error: friendshipsError } = await supabaseAdmin
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (friendshipsError) {
      logStep("Friendships error", { error: friendshipsError.message });
      return new Response(
        JSON.stringify({ error: friendshipsError.message, friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!friendships || friendships.length === 0) {
      logStep("No friendships found");
      return new Response(
        JSON.stringify({ friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const friendIds = friendships.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    logStep("Friend IDs", { count: friendIds.length });

    // Get friends with birthdays today from profiles_private (using service role)
    const { data: birthdayUsers, error: birthdayError } = await supabaseAdmin
      .from("profiles_private")
      .select("user_id, birthday")
      .in("user_id", friendIds)
      .like("birthday", birthdayPattern);

    if (birthdayError) {
      logStep("Birthday query error", { error: birthdayError.message });
      return new Response(
        JSON.stringify({ error: birthdayError.message, friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!birthdayUsers || birthdayUsers.length === 0) {
      logStep("No friends with birthdays today");
      return new Response(
        JSON.stringify({ friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const birthdayUserIds = birthdayUsers.map(u => u.user_id);
    logStep("Birthday users found", { count: birthdayUserIds.length });

    // Get profile details for birthday friends
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, avatar_url, username")
      .in("user_id", birthdayUserIds);

    if (profilesError) {
      logStep("Profiles query error", { error: profilesError.message });
      return new Response(
        JSON.stringify({ error: profilesError.message, friends: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("Success", { friendsWithBirthdays: profiles?.length || 0 });

    return new Response(
      JSON.stringify({ friends: profiles || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, friends: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
