import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to generate personalized birthday image with name overlay
// Styled like the "Milly" example - coral/salmon pink gradient with golden swoosh
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
    
    // Create SVG with the name overlaid using "Milly" style gradient
    const svgWidth = 1080;
    const svgHeight = 1080;
    const nameYPosition = 700;
    const swooshYPosition = 730;
    
    const displayName = friendFirstName || "Friend";
    const swooshWidth = Math.min(displayName.length * 45, 400);
    const swooshStartX = (svgWidth / 2) - (swooshWidth / 2);
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
        <defs>
          <linearGradient id="nameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#E8707A;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#E88A7A;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#D4756E;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="swooshGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:0.3" />
            <stop offset="30%" style="stop-color:#FFA500;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#FFD700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0.3" />
          </linearGradient>
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.15)"/>
          </filter>
        </defs>
        <image href="data:image/jpeg;base64,${imageBase64}" width="${svgWidth}" height="${svgHeight}"/>
        <text 
          x="50%" 
          y="${nameYPosition}" 
          text-anchor="middle" 
          font-family="'Lobster', 'Pacifico', 'Cookie', cursive, Arial" 
          font-size="90" 
          font-weight="normal"
          fill="url(#nameGradient)"
          filter="url(#textShadow)"
        >${displayName}</text>
        <path 
          d="M${swooshStartX},${swooshYPosition} 
             Q${svgWidth/2},${swooshYPosition + 25} 
             ${swooshStartX + swooshWidth},${swooshYPosition}"
          stroke="url(#swooshGradient)"
          stroke-width="4"
          fill="none"
          stroke-linecap="round"
        />
      </svg>
    `;
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const svgArrayBuffer = await svgBlob.arrayBuffer();
    
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `birthday-wishes/${timestamp}-${randomId}.svg`;
    
    const { error: uploadError } = await supabase.storage
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's month and day for birthday matching
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const birthdayPattern = `%-${todayMonth}-${todayDay}`;

    console.log(`Processing automatic birthday wishes for: ${todayMonth}-${todayDay}`);

    // Find all members whose birthday is today (checking month-day from birthday field)
    const { data: birthdayMembers, error: fetchError } = await supabase
      .from("profiles_private")
      .select("user_id, birthday")
      .like("birthday", birthdayPattern);

    if (fetchError) {
      console.error("Error fetching birthday members:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${birthdayMembers?.length || 0} members with birthdays today`);

    if (!birthdayMembers || birthdayMembers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No birthdays today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://id-preview--7da6d8d7-03a1-4436-af31-faa165a6dce0.lovable.app";
    const templateImageUrl = `${siteUrl}/images/birthday-template.jpeg`;

    let processedCount = 0;
    let errorCount = 0;

    for (const member of birthdayMembers) {
      try {
        console.log(`Processing birthday for member: ${member.user_id}`);

        // Get member's profile for their name
        const { data: memberProfile } = await supabase
          .from("profiles")
          .select("display_name, first_name, user_id")
          .eq("user_id", member.user_id)
          .single();

        if (!memberProfile) {
          console.log(`No profile found for user ${member.user_id}`);
          continue;
        }

        // Get the first name
        const firstName = memberProfile.first_name || 
          (memberProfile.display_name?.split(" ")[0]) || 
          "Friend";

        // Generate personalized birthday image
        const birthdayImageUrl = await generateBirthdayImage(
          supabase,
          firstName,
          templateImageUrl
        );

        // Create the birthday message from Dolphysn
        const birthdayMessage = `🎂🎉 Happy Birthday, ${firstName}! 🎉🎂\n\nWishing you a fantastic day filled with joy, laughter, and wonderful memories!\n\nWith love,\n💙 The Dolphysn Team`;

        // Create a special birthday post (public so friends can see it)
        const { data: post, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: member.user_id,
            content: birthdayMessage,
            visibility: "public",
            media_urls: birthdayImageUrl ? [birthdayImageUrl] : null,
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error creating birthday post for ${member.user_id}:`, postError);
          errorCount++;
          continue;
        }

        // Also send a direct message notification
        await supabase
          .from("messages")
          .insert({
            sender_id: member.user_id, // Self-message as notification
            receiver_id: member.user_id,
            content: `🎂 Happy Birthday from Dolphysn! We've posted a special birthday card on your profile. Check it out! 🎉`,
          });

        processedCount++;
        console.log(`Successfully sent birthday wish to ${firstName} (${member.user_id})`);
        
      } catch (error) {
        console.error(`Error processing birthday for ${member.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`Processed ${processedCount} birthday wishes, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: birthdayMembers.length,
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
