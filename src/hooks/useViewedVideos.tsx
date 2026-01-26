import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useViewedVideos = () => {
  const { user } = useAuth();
  const [viewedVideoIds, setViewedVideoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch viewed videos on mount
  useEffect(() => {
    const fetchViewedVideos = async () => {
      if (!user) {
        setViewedVideoIds(new Set());
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("viewed_youtube_videos")
          .select("video_id")
          .eq("user_id", user.id);

        if (error) throw error;

        const ids = new Set(data?.map((v) => v.video_id) || []);
        setViewedVideoIds(ids);
      } catch (error) {
        console.error("Error fetching viewed videos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewedVideos();
  }, [user]);

  // Mark a video as viewed
  const markAsViewed = useCallback(
    async (videoId: string) => {
      if (!user || viewedVideoIds.has(videoId)) return;

      try {
        const { error } = await supabase.from("viewed_youtube_videos").upsert(
          {
            user_id: user.id,
            video_id: videoId,
          },
          {
            onConflict: "user_id,video_id",
          }
        );

        if (error) throw error;

        setViewedVideoIds((prev) => new Set([...prev, videoId]));
      } catch (error) {
        console.error("Error marking video as viewed:", error);
      }
    },
    [user, viewedVideoIds]
  );

  // Check if a video has been viewed
  const isViewed = useCallback(
    (videoId: string) => viewedVideoIds.has(videoId),
    [viewedVideoIds]
  );

  return {
    viewedVideoIds,
    isLoading,
    markAsViewed,
    isViewed,
  };
};
