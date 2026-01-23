import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const userId = user.id;
    const userEmail = user.email;
    logStep("Processing account deletion for user", { userId, email: userEmail?.slice(0, 3) + "***" });

    // 1. Get user's private profile for Stripe customer ID
    const { data: privateProfile } = await supabaseClient
      .from("profiles_private")
      .select("stripe_customer_id, paypal_customer_id")
      .eq("user_id", userId)
      .single();

    logStep("Retrieved private profile", { 
      hasStripeCustomer: !!privateProfile?.stripe_customer_id,
      hasPaypalCustomer: !!privateProfile?.paypal_customer_id 
    });

    // 2. Get user's active subscriptions from database
    const { data: subscriptions } = await supabaseClient
      .from("subscriptions")
      .select("provider_subscription_id, payment_provider, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]);

    // 3. Cancel Stripe subscriptions AND delete customer if exists
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });

      // Cancel all active subscriptions
      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          if (sub.payment_provider === "stripe" && sub.provider_subscription_id) {
            try {
              await stripe.subscriptions.cancel(sub.provider_subscription_id);
              logStep("Cancelled Stripe subscription", { subscriptionId: sub.provider_subscription_id });
            } catch (stripeError: any) {
              logStep("Failed to cancel Stripe subscription", { error: stripeError.message });
              // Continue with deletion even if cancellation fails
            }
          }
        }
      }

      // DELETE THE STRIPE CUSTOMER to prevent future webhook triggers
      if (privateProfile?.stripe_customer_id) {
        try {
          await stripe.customers.del(privateProfile.stripe_customer_id);
          logStep("Deleted Stripe customer", { customerId: privateProfile.stripe_customer_id });
        } catch (stripeError: any) {
          logStep("Failed to delete Stripe customer", { error: stripeError.message });
          // Continue with deletion even if customer deletion fails
        }
      }
    }

    // 4. Cancel any pending commissions where this user was referred
    // (referrer should not receive payment for a deleted member)
    await supabaseClient
      .from("commissions")
      .update({ status: "cancelled" })
      .eq("referred_user_id", userId)
      .eq("status", "pending");

    logStep("Cancelled pending commissions for referred user");

    // 5. Clean up any deduplication markers for this email
    if (userEmail) {
      const today = new Date().toISOString().split('T')[0];
      const dedupeKey = `renewal_email_${userEmail.toLowerCase()}_${today}`;
      await supabaseClient
        .from("platform_settings")
        .delete()
        .eq("setting_key", dedupeKey);
      logStep("Cleaned up email deduplication markers");
    }

    // 6. Delete user data from all tables (using service role to bypass RLS)
    const deletions = await Promise.allSettled([
      supabaseClient.from("posts").delete().eq("user_id", userId),
      supabaseClient.from("post_likes").delete().eq("user_id", userId),
      supabaseClient.from("post_comments").delete().eq("user_id", userId),
      supabaseClient.from("post_reactions").delete().eq("user_id", userId),
      supabaseClient.from("stories").delete().eq("user_id", userId),
      supabaseClient.from("story_views").delete().eq("viewer_id", userId),
      supabaseClient.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      supabaseClient.from("friendships").delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabaseClient.from("event_rsvps").delete().eq("user_id", userId),
      supabaseClient.from("phone_verification_codes").delete().eq("user_id", userId),
      supabaseClient.from("email_verification_codes").delete().eq("user_id", userId),
      supabaseClient.from("commissions").delete().eq("referrer_id", userId),
      supabaseClient.from("pending_commission_notifications").delete().eq("referrer_id", userId),
      supabaseClient.from("subscriptions").delete().eq("user_id", userId),
      supabaseClient.from("user_roles").delete().eq("user_id", userId),
      supabaseClient.from("privacy_settings").delete().eq("user_id", userId),
      supabaseClient.from("profile_details").delete().eq("user_id", userId),
      supabaseClient.from("bookmarks").delete().eq("user_id", userId),
      supabaseClient.from("bookmark_collections").delete().eq("user_id", userId),
      supabaseClient.from("blocked_users").delete().or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`),
      supabaseClient.from("muted_users").delete().or(`user_id.eq.${userId},muted_user_id.eq.${userId}`),
      supabaseClient.from("group_members").delete().eq("user_id", userId),
      supabaseClient.from("scheduled_birthday_wishes").delete().eq("user_id", userId),
      supabaseClient.from("profiles_private").delete().eq("user_id", userId),
      supabaseClient.from("profiles").delete().eq("user_id", userId),
    ]);

    // Log any failed deletions
    deletions.forEach((result, index) => {
      if (result.status === 'rejected') {
        logStep(`Deletion ${index} failed`, { error: result.reason });
      }
    });

    logStep("Deleted user data from tables");

    // 7. Delete the auth user
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      logStep("Failed to delete auth user", { error: deleteAuthError.message });
      // Don't throw - user data is already deleted
    } else {
      logStep("Deleted auth user");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account deleted successfully" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    logStep("Error deleting account", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
