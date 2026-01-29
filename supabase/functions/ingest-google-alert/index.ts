import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Parse Google Alert email content to extract news items
const parseGoogleAlertEmail = (
  subject: string,
  html: string | undefined,
  text: string | undefined
): { title: string; summary: string; sourceUrl: string }[] => {
  const items: { title: string; summary: string; sourceUrl: string }[] = [];

  // Google Alerts typically have links in the HTML
  if (html) {
    // Match news item patterns from Google Alert HTML
    // Format: <a href="URL">Title</a> followed by snippet text
    const linkPattern = /<a[^>]*href="(https:\/\/www\.google\.com\/url\?[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const googleUrl = match[1];
      const title = match[2].trim();

      // Decode the actual URL from Google's redirect
      const urlMatch = googleUrl.match(/url=([^&]+)/);
      const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : googleUrl;

      // Skip Google's own links
      if (
        actualUrl.includes("google.com/alerts") ||
        actualUrl.includes("support.google.com")
      ) {
        continue;
      }

      // Extract summary - look for text after the link
      const afterLink = html.substring(match.index + match[0].length);
      const summaryMatch = afterLink.match(
        /^[^<]*?([A-Z][^<]{20,200}?)(?:<|$)/
      );
      const summary = summaryMatch
        ? summaryMatch[1].trim().replace(/\s+/g, " ")
        : "";

      if (title.length > 10) {
        items.push({
          title,
          summary: summary || title,
          sourceUrl: actualUrl,
        });
      }
    }
  }

  // Fallback to text parsing if no HTML items found
  if (items.length === 0 && text) {
    const lines = text.split("\n").filter((l) => l.trim());
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for URLs
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch && line.length > 30) {
        items.push({
          title: line.substring(0, 200),
          summary: lines[i + 1]?.trim() || "",
          sourceUrl: urlMatch[0],
        });
      }
    }
  }

  // Limit to max 15 items per alert
  return items.slice(0, 15);
};

// Determine category from subject or content
const determineCategory = (
  subject: string,
  categories: { id: string; name: string; slug: string }[]
): string | null => {
  const subjectLower = subject.toLowerCase();

  // Check for category keywords in subject
  for (const cat of categories) {
    if (
      subjectLower.includes(cat.slug) ||
      subjectLower.includes(cat.name.toLowerCase())
    ) {
      return cat.id;
    }
  }

  // Common keyword mappings
  const keywordMap: Record<string, string> = {
    sport: "sports",
    football: "sports",
    basketball: "sports",
    soccer: "sports",
    tennis: "sports",
    tech: "technology",
    ai: "technology",
    software: "technology",
    business: "business",
    economy: "business",
    market: "finance",
    stock: "finance",
    movie: "entertainment",
    music: "entertainment",
    celebrity: "entertainment",
    health: "health",
    medical: "health",
    science: "science",
    research: "science",
    politics: "politics",
    government: "politics",
    world: "world-news",
    international: "world-news",
  };

  for (const [keyword, slug] of Object.entries(keywordMap)) {
    if (subjectLower.includes(keyword)) {
      const matchingCat = categories.find((c) => c.slug === slug);
      if (matchingCat) {
        return matchingCat.id;
      }
    }
  }

  return null;
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

    // Parse the incoming email from Resend webhook
    const emailData: ResendInboundEmail = await req.json();

    console.log("[INGEST-GOOGLE-ALERT] Received email:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Check if this is from Google Alerts
    if (
      !emailData.from.toLowerCase().includes("googlealerts") &&
      !emailData.from.toLowerCase().includes("google.com")
    ) {
      console.log("[INGEST-GOOGLE-ALERT] Not a Google Alert email, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Not a Google Alert email" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch available categories
    const { data: categories, error: catError } = await supabase
      .from("news_categories")
      .select("id, name, slug");

    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`);
    }

    // Determine category from subject
    const categoryId = determineCategory(emailData.subject, categories || []);

    if (!categoryId) {
      console.log(
        "[INGEST-GOOGLE-ALERT] Could not determine category for:",
        emailData.subject
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: "Could not determine category",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse news items from email
    const newsItems = parseGoogleAlertEmail(
      emailData.subject,
      emailData.html,
      emailData.text
    );

    console.log(
      `[INGEST-GOOGLE-ALERT] Parsed ${newsItems.length} news items for category ${categoryId}`
    );

    // Insert news items
    const insertData = newsItems.map((item) => ({
      category_id: categoryId,
      title: item.title,
      summary: item.summary,
      source_url: item.sourceUrl,
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(), // 42 hours
    }));

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from("news_items")
        .insert(insertData);

      if (insertError) {
        console.error("[INGEST-GOOGLE-ALERT] Insert error:", insertError);
        throw new Error(`Failed to insert news items: ${insertError.message}`);
      }
    }

    // Trigger cleanup to enforce max 15 per category
    await supabase.functions.invoke("cleanup-news");

    console.log(
      `[INGEST-GOOGLE-ALERT] Successfully ingested ${newsItems.length} news items`
    );

    return new Response(
      JSON.stringify({
        success: true,
        itemsIngested: newsItems.length,
        categoryId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[INGEST-GOOGLE-ALERT] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
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
