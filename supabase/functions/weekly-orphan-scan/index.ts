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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Running weekly orphan data scan...");

    // Get all valid profile user_ids
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id");
    
    const validUserIds = new Set(profiles?.map(p => p.user_id) || []);

    // Count orphaned commissions
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

    const totalOrphaned = orphanedCommissions + orphanedSubscriptions + orphanedPosts + orphanedFriendships + orphanedMessages;

    console.log(`Scan complete. Found ${totalOrphaned} orphaned records.`);

    // Only send alert if there are orphaned records
    if (totalOrphaned > 0 && resendApiKey) {
      // Get admin emails
      const { data: adminRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map(r => r.user_id);
        
        const { data: adminProfiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("user_id", adminUserIds)
          .not("email", "is", null);

        const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];

        if (adminEmails.length > 0) {
          // Send email alert to admins
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">⚠️ Weekly Orphan Data Alert</h2>
              <p>The weekly scan has detected <strong>${totalOrphaned} orphaned records</strong> in your database:</p>
              <ul style="line-height: 1.8;">
                <li><strong>${orphanedCommissions}</strong> orphaned commission records</li>
                <li><strong>${orphanedSubscriptions}</strong> orphaned subscription records</li>
                <li><strong>${orphanedPosts}</strong> orphaned post records</li>
                <li><strong>${orphanedFriendships}</strong> orphaned friendship records</li>
                <li><strong>${orphanedMessages}</strong> orphaned message records</li>
              </ul>
              <p>These records reference users that no longer exist in the system.</p>
              <p style="margin-top: 20px;">
                <a href="${supabaseUrl.replace('.supabase.co', '')}/admin/data-cleanup" 
                   style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Clean Up Now
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated weekly scan. You can disable these alerts in your admin settings.
              </p>
            </div>
          `;

          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "System <noreply@resend.dev>",
                to: adminEmails,
                subject: `⚠️ Weekly Alert: ${totalOrphaned} Orphaned Records Found`,
                html: emailHtml,
              }),
            });

            if (emailResponse.ok) {
              console.log(`Alert email sent to ${adminEmails.length} admin(s)`);
            } else {
              console.error("Failed to send alert email:", await emailResponse.text());
            }
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalOrphaned,
      orphanedCommissions,
      orphanedSubscriptions,
      orphanedPosts,
      orphanedFriendships,
      orphanedMessages,
      alertSent: totalOrphaned > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in weekly-orphan-scan:", error);

    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
