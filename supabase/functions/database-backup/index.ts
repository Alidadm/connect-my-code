import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tables to backup - critical data tables
const TABLES_TO_BACKUP = [
  "profiles",
  "posts",
  "post_reactions",
  "comments",
  "friendships",
  "follows",
  "groups",
  "group_members",
  "group_posts",
  "group_post_comments",
  "events",
  "event_rsvps",
  "bookmarks",
  "bookmark_collections",
  "blogs",
  "blog_blocks",
  "marketplace_listings",
  "penpal_preferences",
  "penpal_connections",
  "subscriptions",
  "commissions",
  "user_roles",
  "businesses",
  "family_members",
  "custom_lists",
  "custom_list_members",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if called via cron (no auth) or manually (require admin)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);

      if (!claimsError && claims?.claims?.sub) {
        userId = claims.claims.sub as string;

        // Check if admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          return new Response(
            JSON.stringify({ error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const backupFileName = `backup-${today}.json`;

    console.log(`Starting backup for ${today}...`);

    // Collect all table data
    const backupData: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};

    for (const table of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .limit(50000); // Safety limit

        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          backupData[table] = [];
          rowCounts[table] = 0;
        } else {
          backupData[table] = data || [];
          rowCounts[table] = data?.length || 0;
          console.log(`Backed up ${table}: ${rowCounts[table]} rows`);
        }
      } catch (err) {
        console.error(`Failed to backup ${table}:`, err);
        backupData[table] = [];
        rowCounts[table] = 0;
      }
    }

    // Create backup JSON
    const backupJson = JSON.stringify({
      version: "1.0",
      created_at: new Date().toISOString(),
      tables: backupData,
    });

    const backupBytes = new TextEncoder().encode(backupJson);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("database-backups")
      .upload(backupFileName, backupBytes, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    // Record backup in database
    const { error: insertError } = await supabase
      .from("database_backups")
      .upsert({
        backup_date: today,
        file_path: backupFileName,
        file_size: backupBytes.length,
        tables_included: TABLES_TO_BACKUP,
        row_counts: rowCounts,
        status: "completed",
        completed_at: new Date().toISOString(),
        created_by: userId,
      }, { onConflict: "backup_date" });

    if (insertError) {
      console.error("Failed to record backup:", insertError.message);
    }

    // Clean up old backups (keep last 5 days)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: oldBackups } = await supabase
      .from("database_backups")
      .select("id, file_path, backup_date")
      .lt("backup_date", fiveDaysAgo.toISOString().split("T")[0]);

    if (oldBackups && oldBackups.length > 0) {
      for (const backup of oldBackups) {
        // Delete from storage
        await supabase.storage
          .from("database-backups")
          .remove([backup.file_path]);

        // Delete from database
        await supabase
          .from("database_backups")
          .delete()
          .eq("id", backup.id);

        console.log(`Deleted old backup: ${backup.file_path}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_date: today,
        file_path: backupFileName,
        file_size: backupBytes.length,
        tables_backed_up: TABLES_TO_BACKUP.length,
        row_counts: rowCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
