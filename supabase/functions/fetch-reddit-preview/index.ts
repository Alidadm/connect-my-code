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

    // Check if this is a direct media URL (not a Reddit post URL)
    const directMediaHosts = ["i.redd.it", "v.redd.it", "packaged-media.redd.it", "preview.redd.it"];
    const parsedUrl = new URL(cleanUrl);
    const isDirectMedia = directMediaHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`));

    if (isDirectMedia) {
      // For direct media URLs, return minimal metadata without calling oEmbed
      const isVideo = cleanUrl.includes(".mp4") || cleanUrl.includes("v.redd.it") || cleanUrl.includes("packaged-media.redd.it");
      const result = {
        title: "Reddit Media",
        author: null,
        subreddit: "Reddit",
        html: null,
        thumbnail_url: isVideo ? null : cleanUrl,
        media_url: cleanUrl,
        media_type: isVideo ? "video" : "image",
        permalink: cleanUrl,
        is_direct_media: true,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate that this looks like an actual Reddit post/comment URL
    // oEmbed only works with paths like /r/subreddit/comments/...
    const isValidRedditPostUrl = /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\//.test(cleanUrl);

    if (!isValidRedditPostUrl) {
      // Return a fallback preview for non-post Reddit URLs (tracking links, homepages, etc.)
      const result = {
        title: "Reddit Link",
        author: null,
        subreddit: "Reddit",
        html: null,
        thumbnail_url: null,
        permalink: cleanUrl,
        is_direct_media: false,
        is_fallback: true,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Reddit's official oEmbed endpoint for post URLs
    const oembedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    console.log("Fetching Reddit oEmbed:", oembedUrl);

    const response = await fetch(oembedUrl, {
      headers: { "Accept": "application/json" },
    });

    console.log("Reddit oEmbed response status:", response.status);

    if (!response.ok) {
      const body = await response.text();
      console.error("oEmbed error body:", body);
      // Return fallback instead of error
      const result = {
        title: "Reddit Post",
        author: null,
        subreddit: "Reddit",
        html: null,
        thumbnail_url: null,
        permalink: cleanUrl,
        is_direct_media: false,
        is_fallback: true,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oembed = await response.json();

    const result = {
      title: oembed.title || "Reddit Post",
      author: oembed.author_name || null,
      subreddit: oembed.provider_name || "Reddit",
      html: oembed.html || null,
      thumbnail_url: oembed.thumbnail_url || null,
      permalink: cleanUrl,
      is_direct_media: false,
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
