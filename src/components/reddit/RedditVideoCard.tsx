import { useState } from "react";
import { ExternalLink, Play, Bookmark, BookmarkCheck } from "lucide-react";
import { RedditVideoGroup, RedditVideo } from "@/hooks/useRedditVideos";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface RedditVideoCardProps {
  group: RedditVideoGroup;
}

export const RedditVideoCard = ({ group }: RedditVideoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const videos = group.videos || [];

  // Fetch saved state for all videos in this group
  const { data: savedIds = new Set<string>() } = useQuery({
    queryKey: ["saved-reddit-items", user?.id, group.id],
    enabled: !!user && isOpen,
    queryFn: async () => {
      const videoIds = videos.map((v) => v.id);
      const { data } = await supabase
        .from("saved_reddit_items")
        .select("reddit_video_id")
        .eq("user_id", user!.id)
        .in("reddit_video_id", videoIds);
      return new Set(data?.map((d) => d.reddit_video_id) || []);
    },
  });

  if (videos.length === 0) return null;

  const toggleSave = async (videoId: string) => {
    if (!user) return;
    const isSaved = savedIds.has(videoId);

    if (isSaved) {
      await supabase
        .from("saved_reddit_items")
        .delete()
        .eq("user_id", user.id)
        .eq("reddit_video_id", videoId);
      toast.success("Removed from saved");
    } else {
      await supabase
        .from("saved_reddit_items")
        .insert({ user_id: user.id, reddit_video_id: videoId });
      toast.success("Saved!");
    }

    queryClient.invalidateQueries({ queryKey: ["saved-reddit-items"] });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex-shrink-0 relative w-28 h-48 rounded-xl overflow-hidden group",
          "bg-gradient-to-br from-orange-500 via-red-500 to-orange-700",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
      >
        {videos[0]?.thumbnail_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${videos[0].thumbnail_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-6 w-6 text-orange-600 fill-orange-600 ml-0.5" />
          </div>
        </div>
        {videos.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
            {videos.length}
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[8px]">r/</span>
            </div>
            <span className="text-white text-xs font-medium truncate">
              {group.title || "Reddit"}
            </span>
          </div>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 pt-8">
          <DialogHeader className="sr-only">
            <DialogTitle>{group.title || "Reddit Links"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="relative">
                  <RedditPreviewCard url={video.reddit_url} />
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={() => toggleSave(video.id)}
                    >
                      {savedIds.has(video.id) ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
