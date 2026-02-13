import { useState } from "react";
import { useRedditFeedVideos } from "@/hooks/useRedditVideos";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bookmark, Share2, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const useRedditSaved = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedIds } = useQuery({
    queryKey: ["saved-reddit-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("saved_reddit_items")
        .select("reddit_video_id")
        .eq("user_id", user.id);
      return (data || []).map((d) => d.reddit_video_id);
    },
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) throw new Error("Not logged in");
      const isSaved = (savedIds || []).includes(videoId);
      if (isSaved) {
        await supabase
          .from("saved_reddit_items")
          .delete()
          .eq("user_id", user.id)
          .eq("reddit_video_id", videoId);
      } else {
        await supabase
          .from("saved_reddit_items")
          .insert({ user_id: user.id, reddit_video_id: videoId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reddit-ids"] });
    },
  });

  return { savedIds: savedIds || [], toggle };
};

const RedditCardActions = ({ videoId, url }: { videoId: string; url: string }) => {
  const { savedIds, toggle } = useRedditSaved();
  const isSaved = savedIds.includes(videoId);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Reddit", url }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-t border-border">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 sm:gap-2 text-muted-foreground hover:text-white"
          onClick={() => window.open(url, "_blank")}
        >
          <ExternalLink className="h-5 w-5" />
          <span className="hidden sm:inline">Open</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 sm:gap-2 text-muted-foreground hover:text-white"
          onClick={handleCopy}
        >
          <Copy className="h-5 w-5" />
          <span className="hidden sm:inline">Copy</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 sm:gap-2 text-muted-foreground hover:text-white"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
          <span className="hidden sm:inline">Share</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 sm:gap-2 text-muted-foreground hover:text-white"
          onClick={() => window.open(url, "_blank")}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Comment</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={isSaved ? "text-primary" : "text-muted-foreground"}
        onClick={() => toggle.mutate(videoId)}
        disabled={toggle.isPending}
      >
        <Bookmark className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
      </Button>
    </div>
  );
};

export const RedditFeedRow = () => {
  const { videos, isLoading } = useRedditFeedVideos();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="space-y-4 mb-4">
      {videos.map((video) => (
        <div key={video.id} className="bg-card rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 p-4 pb-2">
            <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">r/</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Reddit</p>
              {video.title && (
                <p className="text-xs text-muted-foreground truncate">{video.title}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <RedditPreviewCard url={video.reddit_url} />
          </div>

          {/* Actions - matching PostCard style */}
          <RedditCardActions videoId={video.id} url={video.reddit_url} />
        </div>
      ))}
    </div>
  );
};
