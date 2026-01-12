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

        // 4. Delete user data from all tables (using service role to bypass RLS)
        await Promise.allSettled([
          supabaseClient.from("posts").delete().eq("user_id", userId),
          supabaseClient.from("post_likes").delete().eq("user_id", userId),
          supabaseClient.from("post_comments").delete().eq("user_id", userId),
          supabaseClient.from("stories").delete().eq("user_id", userId),
          supabaseClient.from("story_views").delete().eq("viewer_id", userId),
          supabaseClient.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
          supabaseClient.from("friendships").delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
          supabaseClient.from("event_rsvps").delete().eq("user_id", userId),
          supabaseClient.from("phone_verification_codes").delete().eq("user_id", userId),
          supabaseClient.from("commissions").delete().eq("referrer_id", userId),
          supabaseClient.from("subscriptions").delete().eq("user_id", userId),
          supabaseClient.from("user_roles").delete().eq("user_id", userId),
          supabaseClient.from("profiles_private").delete().eq("user_id", userId),
          supabaseClient.from("profiles").delete().eq("user_id", userId),
        ]);

        // 5. Delete the auth user
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error(`Failed to delete auth user ${userId}: ${deleteAuthError.message}`);
        }

        results.push({ userId, success: true });
        console.log(`Successfully deleted user: ${userId}`);
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
