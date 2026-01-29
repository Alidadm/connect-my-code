import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[CLEANUP-NEWS] Starting news cleanup...");

    // Step 1: Delete expired news (older than 42 hours)
    const { data: expiredDeleted, error: expiredError } = await supabase
      .from("news_items")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (expiredError) {
      console.error("[CLEANUP-NEWS] Error deleting expired news:", expiredError);
    } else {
      console.log(`[CLEANUP-NEWS] Deleted ${expiredDeleted?.length || 0} expired news items`);
    }

    // Step 2: Get all categories
    const { data: categories, error: catError } = await supabase
      .from("news_categories")
      .select("id");

    if (catError) {
      console.error("[CLEANUP-NEWS] Error fetching categories:", catError);
      throw catError;
    }

    // Step 3: For each category, keep only the 15 most recent items
    let totalTrimmed = 0;

    for (const category of categories || []) {
      // Get all news for this category ordered by published_at desc
      const { data: newsItems, error: newsError } = await supabase
        .from("news_items")
        .select("id, published_at")
        .eq("category_id", category.id)
        .order("published_at", { ascending: false });

      if (newsError) {
        console.error(`[CLEANUP-NEWS] Error fetching news for category ${category.id}:`, newsError);
        continue;
      }

      // If more than 15 items, delete the oldest ones
      if (newsItems && newsItems.length > 15) {
        const idsToDelete = newsItems.slice(15).map((item) => item.id);

        const { error: deleteError } = await supabase
          .from("news_items")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          console.error(`[CLEANUP-NEWS] Error trimming category ${category.id}:`, deleteError);
        } else {
          totalTrimmed += idsToDelete.length;
        }
      }
    }

    console.log(`[CLEANUP-NEWS] Trimmed ${totalTrimmed} news items exceeding category limit`);

    return new Response(
      JSON.stringify({
        success: true,
        expiredDeleted: expiredDeleted?.length || 0,
        trimmed: totalTrimmed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[CLEANUP-NEWS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
