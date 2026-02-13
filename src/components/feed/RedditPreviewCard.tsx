import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, MessageCircle, ExternalLink } from "lucide-react";
import Swal from "sweetalert2";

interface RedditPreviewData {
  title: string;
  subreddit: string;
  author: string | null;
  score: number;
  num_comments: number;
  selftext: string | null;
  permalink: string;
  media_type: "image" | "video" | "text";
  media_url: string | null;
  video_url: string | null;
  thumbnail: string | null;
  over_18: boolean;
}

interface RedditPreviewCardProps {
  url: string;
}

export const RedditPreviewCard = ({ url }: RedditPreviewCardProps) => {
  const [preview, setPreview] = useState<RedditPreviewData | null>(null);
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
        <div className="h-40 bg-muted rounded" />
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

  const handleImageClick = (imageUrl: string) => {
    Swal.fire({
      imageUrl,
      imageAlt: preview.title,
      showConfirmButton: false,
      showCloseButton: true,
      width: "auto",
      padding: "0.5rem",
      background: "rgba(0, 0, 0, 0.9)",
    });
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-[10px]">r/</span>
        </div>
        <span className="text-xs font-semibold text-foreground">{preview.subreddit}</span>
        {preview.author && (
          <span className="text-xs text-muted-foreground">• {preview.author}</span>
        )}
      </div>

      {/* Title */}
      <div className="px-3 pb-2">
        <h4 className="text-sm font-medium text-foreground leading-snug">{preview.title}</h4>
        {preview.selftext && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{preview.selftext}</p>
        )}
      </div>

      {/* Media */}
      {preview.media_type === "image" && preview.media_url && (
        <div
          className="cursor-pointer"
          onClick={() => handleImageClick(preview.media_url!)}
        >
          <img
            src={preview.media_url}
            alt={preview.title}
            className="w-full max-h-[500px] object-contain bg-secondary"
            loading="lazy"
          />
        </div>
      )}

      {preview.media_type === "video" && preview.video_url && (
        <div className="aspect-video bg-secondary">
          <video
            src={preview.video_url}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
            poster={preview.thumbnail || undefined}
          />
        </div>
      )}

      {preview.media_type === "text" && preview.thumbnail && (
        <div className="px-3 pb-2">
          <img
            src={preview.thumbnail}
            alt={preview.title}
            className="w-full max-h-[300px] object-contain bg-secondary rounded"
            loading="lazy"
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowUp className="h-3.5 w-3.5" />
            {preview.score.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {preview.num_comments.toLocaleString()}
          </span>
        </div>
        <a
          href={preview.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View on Reddit
        </a>
      </div>
    </div>
  );
};
