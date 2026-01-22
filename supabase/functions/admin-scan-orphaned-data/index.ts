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

    // Get the admin user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the admin user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) {
      throw new Error("Invalid token");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    console.log(`Admin ${adminUser.id} scanning for orphaned data`);

    // Get all valid profile user_ids
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id");
    
    const validUserIds = new Set(profiles?.map(p => p.user_id) || []);

    // Count orphaned commissions (referrer_id or referred_user_id not in profiles)
    const { data: commissions } = await supabaseClient
      .from("commissions")
      .select("id, referrer_id, referred_user_id");
    
    const orphanedCommissions = commissions?.filter(c => 
      !validUserIds.has(c.referrer_id) || !validUserIds.has(c.referred_user_id)
    ).length || 0;

    // Count orphaned subscriptions
    const { data: subscriptions } = await supabaseClient
      .from("subscriptions")
      .select("id, user_id");
    
    const orphanedSubscriptions = subscriptions?.filter(s => 
      !validUserIds.has(s.user_id)
    ).length || 0;

    // Count orphaned posts
    const { data: posts } = await supabaseClient
      .from("posts")
      .select("id, user_id");
    
    const orphanedPosts = posts?.filter(p => 
      !validUserIds.has(p.user_id)
    ).length || 0;

    // Count orphaned friendships
    const { data: friendships } = await supabaseClient
      .from("friendships")
      .select("id, requester_id, addressee_id");
    
    const orphanedFriendships = friendships?.filter(f => 
      !validUserIds.has(f.requester_id) || !validUserIds.has(f.addressee_id)
    ).length || 0;

    // Count orphaned messages
    const { data: messages } = await supabaseClient
      .from("messages")
      .select("id, sender_id, receiver_id");
    
    const orphanedMessages = messages?.filter(m => 
      !validUserIds.has(m.sender_id) || !validUserIds.has(m.receiver_id)
    ).length || 0;

    const result = {
      orphanedCommissions,
      orphanedSubscriptions,
      orphanedPosts,
      orphanedFriendships,
      orphanedMessages,
      totalOrphaned: orphanedCommissions + orphanedSubscriptions + orphanedPosts + orphanedFriendships + orphanedMessages,
    };

    console.log("Scan results:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in admin-scan-orphaned-data:", error);

    const message = error?.message ?? "Unknown error";
    const isUnauthorized = /Unauthorized/i.test(message);
    const isAuthMissing = /No authorization header|Invalid token/i.test(message);

    const status = isAuthMissing ? 401 : isUnauthorized ? 403 : 400;

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
