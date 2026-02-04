import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Order matters for foreign key constraints
const RESTORE_ORDER = [
  "profiles",
  "user_roles",
  "subscriptions",
  "businesses",
  "groups",
  "group_members",
  "events",
  "event_rsvps",
  "posts",
  "post_reactions",
  "comments",
  "friendships",
  "follows",
  "group_posts",
  "group_post_comments",
  "bookmarks",
  "bookmark_collections",
  "blogs",
  "blog_blocks",
  "marketplace_listings",
  "penpal_preferences",
  "penpal_connections",
  "commissions",
  "family_members",
  "custom_lists",
  "custom_list_members",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    const { backup_id, tables_to_restore } = await req.json();

    if (!backup_id) {
      return new Response(
        JSON.stringify({ error: "backup_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get backup record
    const { data: backup, error: backupError } = await supabase
      .from("database_backups")
      .select("*")
      .eq("id", backup_id)
      .single();

    if (backupError || !backup) {
      return new Response(
        JSON.stringify({ error: "Backup not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("database-backups")
      .download(backup.file_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download backup file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const backupContent = await fileData.text();
    const backupJson = JSON.parse(backupContent);

    const tablesToProcess = tables_to_restore || Object.keys(backupJson.tables);
    const results: Record<string, { success: boolean; rows: number; error?: string }> = {};

    // Restore tables in order
    for (const table of RESTORE_ORDER) {
      if (!tablesToProcess.includes(table)) continue;
      if (!backupJson.tables[table]) continue;

      const rows = backupJson.tables[table];
      if (rows.length === 0) {
        results[table] = { success: true, rows: 0 };
        continue;
      }

      try {
        // Use upsert to handle conflicts
        const { error: upsertError } = await supabase
          .from(table)
          .upsert(rows, { 
            onConflict: "id",
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Error restoring ${table}:`, upsertError.message);
          results[table] = { success: false, rows: 0, error: upsertError.message };
        } else {
          results[table] = { success: true, rows: rows.length };
          console.log(`Restored ${table}: ${rows.length} rows`);
        }
      } catch (err) {
        console.error(`Failed to restore ${table}:`, err);
        results[table] = { success: false, rows: 0, error: String(err) };
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length;
    const totalRows = Object.values(results).reduce((sum, r) => sum + r.rows, 0);

    return new Response(
      JSON.stringify({
        success: true,
        backup_date: backup.backup_date,
        tables_restored: successCount,
        total_rows_restored: totalRows,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Restore error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
