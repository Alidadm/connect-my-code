import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BIRTHDAY-WISHES] ${step}${detailsStr}`);
};

// Function to generate personalized birthday image with name overlay
async function generateBirthdayImage(
  supabase: any,
  friendFirstName: string,
  templateImageUrl: string
): Promise<string | null> {
  try {
    logStep("Generating birthday image", { name: friendFirstName });
    
    const imageResponse = await fetch(templateImageUrl);
    if (!imageResponse.ok) {
      logStep("Failed to fetch template image");
      return null;
    }
    
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
    
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
      logStep("Error uploading birthday image", { error: uploadError.message });
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from("post-media")
      .getPublicUrl(fileName);
    
    logStep("Birthday image uploaded", { url: publicUrl });
    return publicUrl;
    
  } catch (error) {
    logStep("Error generating birthday image", { error: String(error) });
    return null;
  }
}

// Function to send birthday notification email to a friend
async function sendBirthdayEmailToFriend(
  resendApiKey: string,
  friendEmail: string,
  friendName: string,
  birthdayPersonName: string,
  birthdayPersonProfileUrl: string
): Promise<boolean> {
  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <span style="font-size: 48px;">🎂</span>
          <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">Birthday Alert!</h1>
        </div>
        
        <div style="padding: 30px; background: #fef7f0;">
          <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Hey ${friendName}! 👋
            </p>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
              <p style="color: #92400e; font-size: 18px; margin: 0;">
                🎉 Today is <strong>${birthdayPersonName}</strong>'s birthday! 🎉
              </p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
              Don't forget to wish them a happy birthday! A simple message can brighten their special day. 💝
            </p>
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="${birthdayPersonProfileUrl}" style="background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                🎁 Send Birthday Wishes
              </a>
            </div>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; background: #1f2937; border-radius: 0 0 10px 10px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} DolphySN. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
            You're receiving this because ${birthdayPersonName} is your friend on DolphySN.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DolphySN <noreply@dolphysn.com>",
        to: [friendEmail],
        subject: `🎂 It's ${birthdayPersonName}'s Birthday Today! - DolphySN`,
        html: htmlBody,
      }),
    });

    return emailResponse.ok;
  } catch (error) {
    logStep("Error sending birthday email", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's month and day for birthday matching
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const birthdayPattern = `%-${todayMonth}-${todayDay}`;

    logStep("Processing birthday wishes", { date: `${todayMonth}-${todayDay}` });

    // Find all members whose birthday is today
    const { data: birthdayMembers, error: fetchError } = await supabase
      .from("profiles_private")
      .select("user_id, birthday")
      .like("birthday", birthdayPattern);

    if (fetchError) {
      logStep("Error fetching birthday members", { error: fetchError.message });
      throw fetchError;
    }

    logStep("Found birthday members", { count: birthdayMembers?.length || 0 });

    if (!birthdayMembers || birthdayMembers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No birthdays today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://dolphysn.com";
    const templateImageUrl = `${siteUrl}/images/birthday-template.jpeg`;

    let processedCount = 0;
    let friendsNotifiedCount = 0;
    let emailsSentCount = 0;
    let errorCount = 0;

    for (const member of birthdayMembers) {
      try {
        logStep("Processing birthday", { userId: member.user_id.slice(0, 8) + "..." });

        // Get member's profile
        const { data: memberProfile } = await supabase
          .from("profiles")
          .select("display_name, first_name, user_id, username")
          .eq("user_id", member.user_id)
          .single();

        if (!memberProfile) {
          logStep("No profile found", { userId: member.user_id });
          continue;
        }

        const firstName = memberProfile.first_name || 
          (memberProfile.display_name?.split(" ")[0]) || 
          "Friend";
        
        const displayName = memberProfile.display_name || firstName;
        const profileUrl = `${siteUrl}/profile/${member.user_id}`;

        // Generate personalized birthday image
        const birthdayImageUrl = await generateBirthdayImage(
          supabase,
          firstName,
          templateImageUrl
        );

        // Create birthday message from Dolphysn
        const birthdayMessage = `🎂🎉 Happy Birthday, ${firstName}! 🎉🎂\n\nWishing you a fantastic day filled with joy, laughter, and wonderful memories!\n\nWith love,\n💙 The Dolphysn Team`;

        // Create birthday post
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
          logStep("Error creating birthday post", { error: postError.message });
          errorCount++;
          continue;
        }

        // Self-notification about the birthday card
        await supabase
          .from("messages")
          .insert({
            sender_id: member.user_id,
            receiver_id: member.user_id,
            content: `🎂 Happy Birthday from Dolphysn! We've posted a special birthday card on your profile. Check it out! 🎉`,
          });

        processedCount++;

        // === NOTIFY ALL FRIENDS ===
        // Get all accepted friendships for this member
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${member.user_id},addressee_id.eq.${member.user_id}`)
          .eq("status", "accepted");

        if (friendships && friendships.length > 0) {
          logStep("Notifying friends", { count: friendships.length });

          // Get all friend user IDs
          const friendUserIds = friendships.map(f => 
            f.requester_id === member.user_id ? f.addressee_id : f.requester_id
          );

          // Get friend profiles with emails
          const { data: friendProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, first_name")
            .in("user_id", friendUserIds);

          const { data: friendPrivateProfiles } = await supabase
            .from("profiles_private")
            .select("user_id, email")
            .in("user_id", friendUserIds);

          // Create a map of emails
          const emailMap = new Map(
            friendPrivateProfiles?.map(p => [p.user_id, p.email]) || []
          );

          // Send in-app notification to each friend
          const messageInserts = friendUserIds.map(friendId => ({
            sender_id: member.user_id,
            receiver_id: friendId,
            content: `🎂 Today is ${displayName}'s birthday! Don't forget to wish them a happy birthday! 🎉`,
          }));

          const { error: messageError } = await supabase
            .from("messages")
            .insert(messageInserts);

          if (!messageError) {
            friendsNotifiedCount += friendUserIds.length;
            logStep("In-app notifications sent", { count: friendUserIds.length });
          }

          // Send email notifications to each friend (if Resend is configured)
          if (resendApiKey) {
            for (const friendId of friendUserIds) {
              const friendEmail = emailMap.get(friendId);
              const friendProfile = friendProfiles?.find(p => p.user_id === friendId);
              const friendName = friendProfile?.first_name || 
                friendProfile?.display_name?.split(" ")[0] || 
                "Friend";

              if (friendEmail) {
                const emailSent = await sendBirthdayEmailToFriend(
                  resendApiKey,
                  friendEmail,
                  friendName,
                  displayName,
                  profileUrl
                );
                
                if (emailSent) {
                  emailsSentCount++;
                }
              }
            }
            logStep("Email notifications sent", { count: emailsSentCount });
          }
        }

        logStep("Birthday processed successfully", { name: firstName });
        
      } catch (error) {
        logStep("Error processing birthday", { error: String(error) });
        errorCount++;
      }
    }

    logStep("Processing complete", { 
      processed: processedCount, 
      friendsNotified: friendsNotifiedCount,
      emailsSent: emailsSentCount,
      errors: errorCount 
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        friends_notified: friendsNotifiedCount,
        emails_sent: emailsSentCount,
        errors: errorCount,
        total: birthdayMembers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
