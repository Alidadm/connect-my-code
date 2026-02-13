import { useState } from "react";
import { useRedditFeedVideos } from "@/hooks/useRedditVideos";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bookmark, BookmarkCheck, Copy, Share2, MessageCircle } from "lucide-react";
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
    <div className="flex items-center gap-1 pt-2 border-t border-border">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground gap-1.5 h-9"
        onClick={() => window.open(url, "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        <span className="text-xs">Open</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`flex-1 gap-1.5 h-9 ${isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => toggle.mutate(videoId)}
        disabled={toggle.isPending}
      >
        {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        <span className="text-xs">{isSaved ? "Saved" : "Save"}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground gap-1.5 h-9"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
        <span className="text-xs">Copy</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground gap-1.5 h-9"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
        <span className="text-xs">Share</span>
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
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">r/</span>
        </div>
        <h3 className="font-semibold text-foreground">Reddit</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {videos.length} {videos.length === 1 ? "link" : "links"}
        </span>
      </div>

      {videos.map((video) => (
        <div key={video.id} className="space-y-0">
          {video.title && (
            <p className="text-sm font-medium text-foreground mb-1.5">{video.title}</p>
          )}
          <RedditPreviewCard url={video.reddit_url} />
          <RedditCardActions videoId={video.id} url={video.reddit_url} />
        </div>
      ))}
    </div>
  );
};
