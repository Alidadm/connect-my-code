import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string;
  summary: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
}

// Parse Google News RSS to extract news items
const parseGoogleNewsRSS = (xml: string): NewsItem[] => {
  const items: NewsItem[] = [];
  
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    
    // Extract title
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : "";
    // Remove source suffix from Google News titles (e.g., " - BBC News")
    title = title.replace(/\s*-\s*[^-]+$/, "").trim();
    
    // Extract link
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    const sourceUrl = linkMatch ? linkMatch[1].trim() : "";
    
    // Extract description
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    let summary = descMatch ? descMatch[1].trim() : "";
    
    // Try to extract image from description HTML
    let imageUrl: string | null = null;
    const imgMatch = summary.match(/<img[^>]*src=["']([^"']+)["']/i);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }
    
    // Strip HTML tags from summary
    summary = summary.replace(/<[^>]*>/g, "").substring(0, 300).trim();
    
    // Extract pubDate
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
    const publishedAt = pubDateMatch 
      ? new Date(pubDateMatch[1]).toISOString() 
      : new Date().toISOString();
    
    if (title && sourceUrl) {
      items.push({
        title: title.substring(0, 500),
        summary: summary || title,
        sourceUrl,
        imageUrl,
        publishedAt,
      });
    }
  }
  
  return items.slice(0, 15); // Max 15 items
};

// Fetch Google News RSS for keywords
const fetchGoogleNews = async (keywords: string): Promise<NewsItem[]> => {
  try {
    const encodedKeywords = encodeURIComponent(keywords);
    const url = `https://news.google.com/rss/search?q=${encodedKeywords}&hl=en&gl=US&ceid=US:en`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[CUSTOM-NEWS] Failed to fetch for "${keywords}": ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    return parseGoogleNewsRSS(xml);
  } catch (error) {
    console.log(`[CUSTOM-NEWS] Error fetching for "${keywords}":`, error);
    return [];
  }
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
    
    // Get optional category_id from request body
    let specificCategoryId: string | null = null;
    try {
      const body = await req.json();
      specificCategoryId = body.category_id || null;
    } catch {
      // No body or invalid JSON, process all categories
    }

    console.log("[CUSTOM-NEWS] Starting custom news fetch...");

    // Fetch all custom categories (or specific one)
    let query = supabase
      .from("user_custom_news_categories")
      .select("id, user_id, keywords");
    
    if (specificCategoryId) {
      query = query.eq("id", specificCategoryId);
    }

    const { data: categories, error: catError } = await query;

    if (catError) {
      throw new Error(`Failed to fetch custom categories: ${catError.message}`);
    }

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No custom categories found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalIngested = 0;

    for (const category of categories) {
      console.log(`[CUSTOM-NEWS] Fetching news for keywords: "${category.keywords}"`);
      
      const newsItems = await fetchGoogleNews(category.keywords);
      
      if (newsItems.length === 0) continue;

      // Delete existing items for this category
      await supabase
        .from("user_custom_news_items")
        .delete()
        .eq("custom_category_id", category.id);

      // Insert new items
      const insertData = newsItems.map((item) => ({
        custom_category_id: category.id,
        user_id: category.user_id,
        title: item.title,
        summary: item.summary,
        source_url: item.sourceUrl,
        image_url: item.imageUrl,
        published_at: item.publishedAt,
        expires_at: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("user_custom_news_items")
        .insert(insertData);

      if (insertError) {
        console.error(`[CUSTOM-NEWS] Insert error for category ${category.id}:`, insertError);
      } else {
        totalIngested += newsItems.length;
        console.log(`[CUSTOM-NEWS] Inserted ${newsItems.length} items for "${category.keywords}"`);
      }
    }

    console.log(`[CUSTOM-NEWS] Completed. Total items ingested: ${totalIngested}`);

    return new Response(
      JSON.stringify({ success: true, itemsIngested: totalIngested }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[CUSTOM-NEWS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
