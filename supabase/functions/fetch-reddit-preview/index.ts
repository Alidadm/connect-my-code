import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize the URL
    let cleanUrl = url.trim().replace(/\/$/, "");
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Use Reddit's official oEmbed endpoint (publicly available, no auth needed)
    const oembedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    console.log("Fetching Reddit oEmbed:", oembedUrl);

    const response = await fetch(oembedUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    console.log("Reddit oEmbed response status:", response.status);

    if (!response.ok) {
      const body = await response.text();
      console.error("oEmbed error body:", body);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Reddit data", status: response.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oembed = await response.json();
    console.log("oEmbed data:", JSON.stringify(oembed));

    // oEmbed returns HTML embed code, title, author, etc.
    const result = {
      title: oembed.title || "Reddit Post",
      author: oembed.author_name || null,
      subreddit: oembed.provider_name || "Reddit",
      html: oembed.html || null,
      thumbnail_url: oembed.thumbnail_url || null,
      thumbnail_width: oembed.thumbnail_width || null,
      thumbnail_height: oembed.thumbnail_height || null,
      permalink: cleanUrl,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Reddit preview:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
