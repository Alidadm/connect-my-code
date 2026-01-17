import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to generate personalized birthday image with name overlay
async function generateBirthdayImage(
  supabase: any,
  friendFirstName: string,
  templateImageUrl: string
): Promise<string | null> {
  try {
    console.log(`Generating birthday image for: ${friendFirstName}`);
    
    // Fetch the template image
    const imageResponse = await fetch(templateImageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to fetch template image");
      return null;
    }
    
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
    
    // Create SVG with the name overlaid using gradient text
    // The template image is 1080x1080 based on the uploaded image
    const svgWidth = 1080;
    const svgHeight = 1080;
    const nameYPosition = 720; // Position below "Birthday" text
    
    // Clean and prepare the name
    const displayName = friendFirstName || "Friend";
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
        <defs>
          <linearGradient id="nameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FF6B9D;stop-opacity:1" />
            <stop offset="25%" style="stop-color:#C44BE8;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#7B4FE0;stop-opacity:1" />
            <stop offset="75%" style="stop-color:#4F8FE0;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4FDCE0;stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <image href="data:image/jpeg;base64,${imageBase64}" width="${svgWidth}" height="${svgHeight}"/>
        <text 
          x="50%" 
          y="${nameYPosition}" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="72" 
          font-weight="bold"
          font-style="italic"
          fill="url(#nameGradient)"
          filter="url(#shadow)"
        >${displayName}</text>
      </svg>
    `;
    
    // Convert SVG to PNG using a canvas-like approach
    // For Deno edge functions, we'll store the SVG and use it as the image
    // Modern browsers and social platforms render SVG well
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const svgArrayBuffer = await svgBlob.arrayBuffer();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `birthday-wishes/${timestamp}-${randomId}.svg`;
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(fileName, svgArrayBuffer, {
        contentType: "image/svg+xml",
        cacheControl: "3600",
        upsert: false,
      });
    
    if (uploadError) {
      console.error("Error uploading birthday image:", uploadError);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("post-media")
      .getPublicUrl(fileName);
    
    console.log(`Birthday image uploaded: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error("Error generating birthday image:", error);
    return null;
  }
}

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

    // Template image URL (hosted in public folder)
    const siteUrl = Deno.env.get("SITE_URL") || "https://id-preview--7da6d8d7-03a1-4436-af31-faa165a6dce0.lovable.app";
    const templateImageUrl = `${siteUrl}/images/birthday-template.jpeg`;

    let processedCount = 0;
    let errorCount = 0;

    for (const wish of pendingWishes) {
      try {
        console.log(`Processing wish ${wish.id} from user ${wish.user_id} to ${wish.friend_user_id}`);

        // Get friend's profile to get their first name
        const { data: friendProfile } = await supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("user_id", wish.friend_user_id)
          .single();

        // Use first_name if available, otherwise extract from display_name
        const friendFirstName = friendProfile?.first_name || 
          (friendProfile?.display_name?.split(" ")[0]) || 
          "Friend";

        // Generate personalized birthday image with friend's name
        const birthdayImageUrl = await generateBirthdayImage(
          supabase,
          friendFirstName,
          templateImageUrl
        );

        // Prepare media URLs array if image was generated
        const mediaUrls = birthdayImageUrl ? [birthdayImageUrl] : null;

        // Create a post on behalf of the user with the personalized image
        const { data: post, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: wish.user_id,
            content: wish.message,
            visibility: "friends", // Post visible to friends
            media_urls: mediaUrls,
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
            content: `🎂 ${senderProfile?.display_name || "Someone"} posted a birthday wish for you with a personalized card! Check your feed!`,
          });

        processedCount++;
        console.log(`Successfully processed wish ${wish.id} with personalized image for ${friendFirstName}`);
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
