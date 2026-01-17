import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log(`Processing birthday wishes for date: ${todayStr}`);

    // Fetch all pending wishes scheduled for today
    const { data: pendingWishes, error: fetchError } = await supabase
      .from("scheduled_birthday_wishes")
      .select("*")
      .eq("scheduled_date", todayStr)
      .eq("status", "pending");

    if (fetchError) {
      console.error("Error fetching pending wishes:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingWishes?.length || 0} pending wishes to process`);

    if (!pendingWishes || pendingWishes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const wish of pendingWishes) {
      try {
        console.log(`Processing wish ${wish.id} from user ${wish.user_id} to ${wish.friend_user_id}`);

        // Create a post on behalf of the user
        const { data: post, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: wish.user_id,
            content: wish.message,
            visibility: "friends", // Post visible to friends
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error creating post for wish ${wish.id}:`, postError);
          
          // Mark as failed
          await supabase
            .from("scheduled_birthday_wishes")
            .update({ status: "failed" })
            .eq("id", wish.id);
          
          errorCount++;
          continue;
        }

        // Update the wish status to completed
        const { error: updateError } = await supabase
          .from("scheduled_birthday_wishes")
          .update({
            status: "completed",
            posted_post_id: post.id,
          })
          .eq("id", wish.id);

        if (updateError) {
          console.error(`Error updating wish ${wish.id} status:`, updateError);
        }

        // Get sender's display name for notification
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", wish.user_id)
          .single();

        // Send a notification message to the friend
        await supabase
          .from("messages")
          .insert({
            sender_id: wish.user_id,
            receiver_id: wish.friend_user_id,
            content: `🎂 ${senderProfile?.display_name || "Someone"} posted a birthday wish for you! Check your feed!`,
          });

        processedCount++;
        console.log(`Successfully processed wish ${wish.id}`);
      } catch (error) {
        console.error(`Error processing wish ${wish.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Processed ${processedCount} wishes, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: pendingWishes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-birthday-wishes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
