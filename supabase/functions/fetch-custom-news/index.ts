import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string;
  summary: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
}

// Decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
};

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
    // Decode HTML entities in title
    title = decodeHtmlEntities(title);
    
    // Extract link
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    const sourceUrl = linkMatch ? linkMatch[1].trim() : "";
    
    // Extract description
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    let rawDescription = descMatch ? descMatch[1].trim() : "";
    
    // Decode HTML entities first
    rawDescription = decodeHtmlEntities(rawDescription);
    
    // Try to extract image from description HTML
    let imageUrl: string | null = null;
    const imgMatch = rawDescription.match(/<img[^>]*src=["']([^"']+)["']/i);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }
    
    // Extract text content after the anchor tag (the actual summary)
    // Google News format: <a href="...">Title</a>&nbsp;&nbsp;<font color="#6f6f6f">Source</font><font color="#6f6f6f"><a href="...">Related</a></font>
    // We want to skip all this and just use the title as summary if no real content
    let summary = "";
    
    // Remove all anchor tags and their content
    const cleanedDesc = rawDescription
      .replace(/<a[^>]*>.*?<\/a>/gi, "")
      .replace(/<font[^>]*>.*?<\/font>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    
    // If we got meaningful content, use it; otherwise use title
    summary = cleanedDesc.length > 10 ? cleanedDesc.substring(0, 300) : "";
    
    // Extract pubDate
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
    const publishedAt = pubDateMatch 
      ? new Date(pubDateMatch[1]).toISOString() 
      : new Date().toISOString();
    
    if (title && sourceUrl) {
      items.push({
        title: title.substring(0, 500),
        summary: summary || null,
        sourceUrl,
        imageUrl,
        publishedAt,
      });
    }
  }
  
  return items.slice(0, 15); // Max 15 items
};

// Fetch Open Graph image from article URL as fallback
const fetchOGImage = async (url: string): Promise<string | null> => {
  try {
    // Google News URLs redirect, so we need to follow them
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try og:image first
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch) return ogMatch[1];
    
    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterMatch) return twitterMatch[1];
    
    // Try content first then property (alternate order)
    const ogAltMatch = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogAltMatch) return ogAltMatch[1];
    
    return null;
  } catch {
    return null;
  }
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
    const items = parseGoogleNewsRSS(xml);
    
    // Fetch OG images for items without images (limit to avoid timeouts)
    const itemsNeedingImages = items.filter(item => !item.imageUrl).slice(0, 5);
    const ogImagePromises = itemsNeedingImages.map(async (item) => {
      const ogImage = await fetchOGImage(item.sourceUrl);
      if (ogImage) {
        item.imageUrl = ogImage;
      }
    });
    await Promise.all(ogImagePromises);
    
    return items;
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
