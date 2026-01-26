import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getYoutubeThumbnailUrl } from "@/lib/youtube";
import { Play, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ViewedVideo {
  id: string;
  video_id: string;
  viewed_at: string;
}

export const RecentlyWatchedSection = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<ViewedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentlyWatched = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("viewed_youtube_videos")
          .select("*")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(12);

        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error("Error fetching recently watched:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentlyWatched();
  }, [user]);

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("viewed_youtube_videos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Video removed from history");
    } catch (error) {
      console.error("Error removing video:", error);
      toast.error("Failed to remove video");
    }
  };

  const handlePlay = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="aspect-video bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No watch history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Videos you watch will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <div
          key={video.id}
          className="group relative aspect-video rounded-lg overflow-hidden bg-muted"
        >
          <img
            src={getYoutubeThumbnailUrl(video.video_id)}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10"
              onClick={() => handlePlay(video.video_id)}
            >
              <Play className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-10 w-10"
              onClick={() => handleRemove(video.id)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-1 rounded">
            {new Date(video.viewed_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};
