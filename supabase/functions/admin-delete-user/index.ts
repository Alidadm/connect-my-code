import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

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

    // Get user IDs to delete from request body
    const { userIds } = await req.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("No user IDs provided");
    }

    console.log(`Admin ${adminUser.id} deleting ${userIds.length} users:`, userIds);

    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        // 1. Get user's active subscriptions from database
        const { data: subscriptions } = await supabaseClient
          .from("subscriptions")
          .select("provider_subscription_id, payment_provider, status")
          .eq("user_id", userId)
          .in("status", ["active", "trialing"]);

        // 2. Cancel Stripe subscriptions if any exist
        if (stripeSecretKey && subscriptions && subscriptions.length > 0) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
          });

          for (const sub of subscriptions) {
            if (sub.payment_provider === "stripe" && sub.provider_subscription_id) {
              try {
                await stripe.subscriptions.cancel(sub.provider_subscription_id);
                console.log(`Cancelled Stripe subscription: ${sub.provider_subscription_id}`);
              } catch (stripeError: any) {
                console.error(`Failed to cancel Stripe subscription: ${stripeError.message}`);
              }
            }
          }
        }

        // 3. Cancel any pending commissions where this user was referred
        await supabaseClient
          .from("commissions")
          .update({ status: "cancelled" })
          .eq("referred_user_id", userId)
          .eq("status", "pending");

        // 4. Delete commissions where this user was the referred user (orphan prevention)
        await supabaseClient
          .from("commissions")
          .delete()
          .eq("referred_user_id", userId);

        // 5. Delete user data from all tables (using service role to bypass RLS)
        // First delete dependent records to avoid FK constraint issues
        const { data: userPosts } = await supabaseClient
          .from("posts")
          .select("id")
          .eq("user_id", userId);
        
        const postIds = userPosts?.map(p => p.id) || [];
        if (postIds.length > 0) {
          await supabaseClient.from("post_likes").delete().in("post_id", postIds);
          await supabaseClient.from("post_comments").delete().in("post_id", postIds);
          await supabaseClient.from("post_reactions").delete().in("post_id", postIds);
          await supabaseClient.from("post_preferences").delete().in("post_id", postIds);
          await supabaseClient.from("bookmarks").delete().in("post_id", postIds);
          await supabaseClient.from("hidden_posts").delete().in("post_id", postIds);
          await supabaseClient.from("post_reports").delete().in("post_id", postIds);
        }

        // Get user's blogs to delete related records
        const { data: userBlogs } = await supabaseClient
          .from("blogs")
          .select("id")
          .eq("user_id", userId);
        
        const blogIds = userBlogs?.map(b => b.id) || [];
        if (blogIds.length > 0) {
          await supabaseClient.from("blog_likes").delete().in("blog_id", blogIds);
          await supabaseClient.from("blog_comments").delete().in("blog_id", blogIds);
          await supabaseClient.from("blog_blocks").delete().in("blog_id", blogIds);
          await supabaseClient.from("blog_tag_mappings").delete().in("blog_id", blogIds);
        }

        // Get user's custom lists to delete members
        const { data: userLists } = await supabaseClient
          .from("custom_lists")
          .select("id")
          .eq("user_id", userId);
        
        const listIds = userLists?.map(l => l.id) || [];
        if (listIds.length > 0) {
          await supabaseClient.from("custom_list_members").delete().in("list_id", listIds);
        }

        // Get user's bookmark collections
        const { data: userCollections } = await supabaseClient
          .from("bookmark_collections")
          .select("id")
          .eq("user_id", userId);
        
        const collectionIds = userCollections?.map(c => c.id) || [];
        if (collectionIds.length > 0) {
          await supabaseClient.from("bookmarks").delete().in("collection_id", collectionIds);
        }

        // Delete all user data in order (most dependent first)
        const tablesToDelete = [
          // Post-related
          { table: "post_likes", column: "user_id" },
          { table: "post_comments", column: "user_id" },
          { table: "post_reactions", column: "user_id" },
          { table: "post_comment_likes", column: "user_id" },
          { table: "post_preferences", column: "user_id" },
          { table: "post_reports", column: "user_id" },
          { table: "posts", column: "user_id" },
          // Blog-related
          { table: "blog_likes", column: "user_id" },
          { table: "blog_comments", column: "user_id" },
          { table: "blogs", column: "user_id" },
          // Social
          { table: "stories", column: "user_id" },
          { table: "story_views", column: "viewer_id" },
          { table: "messages", column: "sender_id" },
          { table: "messages", column: "receiver_id" },
          { table: "friendships", column: "requester_id" },
          { table: "friendships", column: "addressee_id" },
          { table: "blocked_users", column: "user_id" },
          { table: "blocked_users", column: "blocked_user_id" },
          { table: "muted_users", column: "user_id" },
          { table: "muted_users", column: "muted_user_id" },
          // Groups
          { table: "group_post_likes", column: "user_id" },
          { table: "group_post_comments", column: "user_id" },
          { table: "group_comment_likes", column: "user_id" },
          { table: "group_posts", column: "user_id" },
          { table: "group_members", column: "user_id" },
          { table: "group_join_requests", column: "user_id" },
          { table: "group_announcements", column: "user_id" },
          // Events
          { table: "event_rsvps", column: "user_id" },
          { table: "events", column: "creator_id" },
          // Saved items
          { table: "bookmarks", column: "user_id" },
          { table: "bookmark_collections", column: "user_id" },
          { table: "hidden_posts", column: "user_id" },
          // User settings and verification
          { table: "user_favorites", column: "user_id" },
          { table: "user_settings", column: "user_id" },
          { table: "user_interests", column: "user_id" },
          { table: "privacy_settings", column: "user_id" },
          { table: "phone_verification_codes", column: "user_id" },
          { table: "email_verification_codes", column: "user_id" },
          { table: "password_reset_codes", column: "user_id" },
          // Family
          { table: "family_members", column: "user_id" },
          { table: "family_members", column: "family_member_id" },
          // Business and Pages
          { table: "businesses", column: "user_id" },
          { table: "page_followers", column: "user_id" },
          { table: "pages", column: "owner_id" },
          // Lists
          { table: "custom_list_members", column: "member_user_id" },
          { table: "custom_lists", column: "user_id" },
          // Games
          { table: "sudoku_stats", column: "user_id" },
          // Video tracking
          { table: "viewed_short_videos", column: "user_id" },
          { table: "viewed_youtube_videos", column: "user_id" },
          // Presence
          { table: "user_presence", column: "user_id" },
          // Birthday wishes
          { table: "scheduled_birthday_wishes", column: "user_id" },
          // Commission and subscription related
          { table: "pending_commission_notifications", column: "referrer_id" },
          { table: "withdrawal_requests", column: "user_id" },
          { table: "commissions", column: "referrer_id" },
          { table: "commissions", column: "referred_user_id" },
          { table: "subscriptions", column: "user_id" },
          { table: "user_roles", column: "user_id" },
          // Profile related (delete last)
          { table: "profile_details", column: "user_id" },
          { table: "profiles_private", column: "user_id" },
          { table: "profiles", column: "user_id" },
        ];

        for (const { table, column } of tablesToDelete) {
          try {
            await supabaseClient.from(table).delete().eq(column, userId);
          } catch (e: any) {
            console.log(`Note: Could not delete from ${table}.${column}: ${e.message}`);
          }
        }

        // 5. Delete the auth user - this is the critical step
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error(`Failed to delete auth user ${userId}: ${deleteAuthError.message}`);
          // Mark as failure since the auth user still exists
          // Note: Related data was already deleted above, but the auth user remains
          results.push({ userId, success: false, error: `Auth deletion failed: ${deleteAuthError.message}` });
          console.log(`Failed to fully delete user: ${userId} - auth record remains`);
        } else {
          results.push({ userId, success: true });
          console.log(`Successfully deleted user: ${userId}`);
        }
      } catch (userError: any) {
        console.error(`Error deleting user ${userId}:`, userError);
        results.push({ userId, success: false, error: userError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Deleted ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Error in admin-delete-user:", error);

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
