import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// RSS feed sources mapped to category slugs
const RSS_FEEDS: Record<string, string[]> = {
  "world-news": [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  ],
  "politics": [
    "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
  ],
  "business": [
    "https://feeds.bbci.co.uk/news/business/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
  ],
  "technology": [
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
  ],
  "science": [
    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
  ],
  "health": [
    "https://feeds.bbci.co.uk/news/health/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",
  ],
  "sports": [
    "https://feeds.bbci.co.uk/sport/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml",
  ],
  "entertainment": [
    "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml",
  ],
  "finance": [
    "https://feeds.bbci.co.uk/news/business/economy/rss.xml",
  ],
  "lifestyle": [
    "https://rss.nytimes.com/services/xml/rss/nyt/Fashion.xml",
  ],
};

interface NewsItem {
  title: string;
  summary: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
}

// Parse RSS XML to extract news items
const parseRSSFeed = (xml: string): NewsItem[] => {
  const items: NewsItem[] = [];
  
  // Match all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    
    // Extract title
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    
    // Extract link
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    const sourceUrl = linkMatch ? linkMatch[1].trim() : "";
    
    // Extract description/summary
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    let summary = descMatch ? descMatch[1].trim() : "";
    // Strip HTML tags from summary
    summary = summary.replace(/<[^>]*>/g, "").substring(0, 300);
    
    // Extract image - try multiple formats
    let imageUrl: string | null = null;
    
    // Try media:thumbnail
    const mediaThumbnailMatch = itemContent.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
    if (mediaThumbnailMatch) {
      imageUrl = mediaThumbnailMatch[1];
    }
    
    // Try media:content
    if (!imageUrl) {
      const mediaContentMatch = itemContent.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*(?:medium=["']image["']|type=["']image)/i);
      if (mediaContentMatch) {
        imageUrl = mediaContentMatch[1];
      }
    }
    
    // Try enclosure with image type
    if (!imageUrl) {
      const enclosureMatch = itemContent.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
      if (enclosureMatch) {
        imageUrl = enclosureMatch[1];
      }
    }
    
    // Try image in description (common in some feeds)
    if (!imageUrl && descMatch) {
      const imgMatch = descMatch[1].match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }
    
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
  
  return items;
};

// Fetch RSS feed with timeout
const fetchFeed = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[RSS] Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.log(`[RSS] Error fetching ${url}:`, error);
    return null;
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

    console.log("[RSS] Starting RSS feed ingestion...");

    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from("news_categories")
      .select("id, slug");

    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`);
    }

    const categoryMap = new Map(categories?.map((c) => [c.slug, c.id]) || []);
    let totalIngested = 0;

    // Process each category
    for (const [slug, feeds] of Object.entries(RSS_FEEDS)) {
      const categoryId = categoryMap.get(slug);
      if (!categoryId) {
        console.log(`[RSS] Category ${slug} not found, skipping`);
        continue;
      }

      console.log(`[RSS] Processing category: ${slug}`);
      const allItems: NewsItem[] = [];

      // Fetch all feeds for this category
      for (const feedUrl of feeds) {
        const xml = await fetchFeed(feedUrl);
        if (xml) {
          const items = parseRSSFeed(xml);
          console.log(`[RSS] Parsed ${items.length} items from ${feedUrl}`);
          allItems.push(...items);
        }
      }

      if (allItems.length === 0) continue;

      // Deduplicate by URL and sort by date
      const uniqueItems = Array.from(
        new Map(allItems.map((item) => [item.sourceUrl, item])).values()
      ).sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Take only the 15 most recent
      const recentItems = uniqueItems.slice(0, 15);

      // Delete existing items for this category
      await supabase
        .from("news_items")
        .delete()
        .eq("category_id", categoryId);

      // Insert new items
      const insertData = recentItems.map((item) => ({
        category_id: categoryId,
        title: item.title,
        summary: item.summary,
        source_url: item.sourceUrl,
        image_url: item.imageUrl,
        published_at: item.publishedAt,
        expires_at: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(), // 42 hours
      }));

      const { error: insertError } = await supabase
        .from("news_items")
        .insert(insertData);

      if (insertError) {
        console.error(`[RSS] Insert error for ${slug}:`, insertError);
      } else {
        totalIngested += recentItems.length;
        console.log(`[RSS] Inserted ${recentItems.length} items for ${slug}`);
      }
    }

    console.log(`[RSS] Completed. Total items ingested: ${totalIngested}`);

    return new Response(
      JSON.stringify({
        success: true,
        itemsIngested: totalIngested,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[RSS] Error:", error);
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
