import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface RedditOEmbedData {
  title: string;
  author: string | null;
  subreddit: string;
  html: string | null;
  thumbnail_url: string | null;
  media_url?: string | null;
  media_type?: string | null;
  permalink: string;
  is_direct_media?: boolean;
}

interface RedditPreviewCardProps {
  url: string;
}

export const RedditPreviewCard = ({ url }: RedditPreviewCardProps) => {
  const [preview, setPreview] = useState<RedditOEmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-reddit-preview", {
          body: { url },
        });
        if (fnError || !data || data.error) {
          setError(true);
          return;
        }
        setPreview(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="h-5 w-3/4 bg-muted rounded mb-2" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">r/</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground block truncate">{url}</span>
          <span className="text-xs text-muted-foreground">Open on Reddit →</span>
        </div>
      </a>
    );
  }

  // Direct media - render video or image directly
  if (preview.is_direct_media) {
    if (preview.media_type === "video" && preview.media_url) {
      return (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <video
            src={preview.media_url}
            controls
            className="w-full max-h-[500px] bg-black"
            preload="metadata"
          />
        </div>
      );
    }
    if (preview.media_type === "image" && preview.media_url) {
      return (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <img src={preview.media_url} alt="Reddit" className="w-full max-h-[500px] object-contain bg-secondary" loading="lazy" />
        </div>
      );
    }
  }

  // For oEmbed results, render the embed in an iframe but strip metadata
  // The oEmbed script creates its own UI, so we render it as-is
  if (preview.html) {
    return (
      <div className="rounded-lg overflow-hidden bg-black">
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body>${preview.html}</body></html>`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          className="w-full border-0"
          style={{ minHeight: "450px", maxHeight: "600px" }}
          loading="lazy"
          title="Reddit content"
        />
      </div>
    );
  }

  // Fallback: just show thumbnail if available
  if (preview.thumbnail_url) {
    return (
      <div className="rounded-lg overflow-hidden bg-black">
        <img src={preview.thumbnail_url} alt=""
          className="w-full object-contain" loading="lazy" />
      </div>
    );
  }

  return null;
};
