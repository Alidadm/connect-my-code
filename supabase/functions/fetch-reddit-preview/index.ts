import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    let cleanUrl = url.trim().replace(/\?.*$/, "").replace(/\/$/, "");
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Fetch Reddit JSON data
    const jsonUrl = `${cleanUrl}.json`;
    const response = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "Dolphysn/1.0 (Social Platform Preview Bot)",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch Reddit data", status: response.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const post = data?.[0]?.data?.children?.[0]?.data;

    if (!post) {
      return new Response(
        JSON.stringify({ error: "Could not parse Reddit post" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract media info
    let mediaType: "image" | "video" | "text" = "text";
    let mediaUrl: string | null = null;
    let videoUrl: string | null = null;
    let thumbnail: string | null = null;

    // Check for image
    if (post.post_hint === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url || "")) {
      mediaType = "image";
      mediaUrl = post.url;
    }
    // Check for Reddit-hosted video
    else if (post.is_video && post.media?.reddit_video?.fallback_url) {
      mediaType = "video";
      videoUrl = post.media.reddit_video.fallback_url;
      thumbnail = post.thumbnail && post.thumbnail !== "self" && post.thumbnail !== "default"
        ? post.thumbnail.replace(/&amp;/g, "&")
        : null;
    }
    // Check for gallery
    else if (post.is_gallery && post.media_metadata) {
      mediaType = "image";
      const firstKey = Object.keys(post.media_metadata)[0];
      const firstMedia = post.media_metadata[firstKey];
      if (firstMedia?.s?.u) {
        mediaUrl = firstMedia.s.u.replace(/&amp;/g, "&");
      }
    }
    // Check for external image link
    else if (post.preview?.images?.[0]?.source?.url) {
      thumbnail = post.preview.images[0].source.url.replace(/&amp;/g, "&");
    }

    // Build clean thumbnail fallback
    if (!thumbnail && post.thumbnail && post.thumbnail !== "self" && post.thumbnail !== "default" && post.thumbnail !== "nsfw" && post.thumbnail !== "spoiler") {
      thumbnail = post.thumbnail.replace(/&amp;/g, "&");
    }

    const result = {
      title: post.title || "Reddit Post",
      subreddit: post.subreddit_name_prefixed || `r/${post.subreddit}`,
      author: post.author ? `u/${post.author}` : null,
      score: post.score || 0,
      num_comments: post.num_comments || 0,
      selftext: post.selftext ? post.selftext.substring(0, 200) : null,
      permalink: `https://www.reddit.com${post.permalink}`,
      media_type: mediaType,
      media_url: mediaUrl,
      video_url: videoUrl,
      thumbnail,
      created_utc: post.created_utc,
      over_18: post.over_18 || false,
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
