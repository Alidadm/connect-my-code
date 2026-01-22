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

    console.log(`Admin ${adminUser.id} cleaning up orphaned data`);

    // Get all valid profile user_ids
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id");
    
    const validUserIds = new Set(profiles?.map(p => p.user_id) || []);
    const validUserIdsArray = Array.from(validUserIds);

    let totalDeleted = 0;

    // Delete orphaned commissions
    const { data: commissions } = await supabaseClient
      .from("commissions")
      .select("id, referrer_id, referred_user_id");
    
    const orphanedCommissionIds = commissions
      ?.filter(c => !validUserIds.has(c.referrer_id) || !validUserIds.has(c.referred_user_id))
      .map(c => c.id) || [];
    
    if (orphanedCommissionIds.length > 0) {
      const { error } = await supabaseClient
        .from("commissions")
        .delete()
        .in("id", orphanedCommissionIds);
      
      if (!error) {
        totalDeleted += orphanedCommissionIds.length;
        console.log(`Deleted ${orphanedCommissionIds.length} orphaned commissions`);
      }
    }

    // Delete orphaned subscriptions
    const { data: subscriptions } = await supabaseClient
      .from("subscriptions")
      .select("id, user_id");
    
    const orphanedSubscriptionIds = subscriptions
      ?.filter(s => !validUserIds.has(s.user_id))
      .map(s => s.id) || [];
    
    if (orphanedSubscriptionIds.length > 0) {
      const { error } = await supabaseClient
        .from("subscriptions")
        .delete()
        .in("id", orphanedSubscriptionIds);
      
      if (!error) {
        totalDeleted += orphanedSubscriptionIds.length;
        console.log(`Deleted ${orphanedSubscriptionIds.length} orphaned subscriptions`);
      }
    }

    // Delete orphaned posts
    const { data: posts } = await supabaseClient
      .from("posts")
      .select("id, user_id");
    
    const orphanedPostIds = posts
      ?.filter(p => !validUserIds.has(p.user_id))
      .map(p => p.id) || [];
    
    if (orphanedPostIds.length > 0) {
      // First delete related records
      await supabaseClient.from("post_likes").delete().in("post_id", orphanedPostIds);
      await supabaseClient.from("post_comments").delete().in("post_id", orphanedPostIds);
      
      const { error } = await supabaseClient
        .from("posts")
        .delete()
        .in("id", orphanedPostIds);
      
      if (!error) {
        totalDeleted += orphanedPostIds.length;
        console.log(`Deleted ${orphanedPostIds.length} orphaned posts`);
      }
    }

    // Delete orphaned friendships
    const { data: friendships } = await supabaseClient
      .from("friendships")
      .select("id, requester_id, addressee_id");
    
    const orphanedFriendshipIds = friendships
      ?.filter(f => !validUserIds.has(f.requester_id) || !validUserIds.has(f.addressee_id))
      .map(f => f.id) || [];
    
    if (orphanedFriendshipIds.length > 0) {
      const { error } = await supabaseClient
        .from("friendships")
        .delete()
        .in("id", orphanedFriendshipIds);
      
      if (!error) {
        totalDeleted += orphanedFriendshipIds.length;
        console.log(`Deleted ${orphanedFriendshipIds.length} orphaned friendships`);
      }
    }

    // Delete orphaned messages
    const { data: messages } = await supabaseClient
      .from("messages")
      .select("id, sender_id, receiver_id");
    
    const orphanedMessageIds = messages
      ?.filter(m => !validUserIds.has(m.sender_id) || !validUserIds.has(m.receiver_id))
      .map(m => m.id) || [];
    
    if (orphanedMessageIds.length > 0) {
      const { error } = await supabaseClient
        .from("messages")
        .delete()
        .in("id", orphanedMessageIds);
      
      if (!error) {
        totalDeleted += orphanedMessageIds.length;
        console.log(`Deleted ${orphanedMessageIds.length} orphaned messages`);
      }
    }

    console.log(`Total deleted: ${totalDeleted}`);

    return new Response(JSON.stringify({ 
      success: true,
      totalDeleted,
      message: `Successfully deleted ${totalDeleted} orphaned records`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in admin-cleanup-orphaned-data:", error);

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
