import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useViewedVideos = () => {
  const { user } = useAuth();
  const [viewedVideoIds, setViewedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all viewed video IDs for current user
  const fetchViewedVideos = useCallback(async () => {
    if (!user) {
      setViewedVideoIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("viewed_youtube_videos")
        .select("video_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setViewedVideoIds(new Set(data?.map(v => v.video_id) || []));
    } catch (error) {
      console.error("Error fetching viewed videos:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchViewedVideos();
  }, [fetchViewedVideos]);

  // Mark a video as viewed
  const markVideoAsViewed = useCallback(async (videoId: string) => {
    if (!user || !videoId) return;

    // Optimistic update
    setViewedVideoIds(prev => new Set([...prev, videoId]));

    try {
      const { error } = await supabase
        .from("viewed_youtube_videos")
        .upsert(
          { user_id: user.id, video_id: videoId },
          { onConflict: "user_id,video_id" }
        );

      if (error) throw error;
    } catch (error) {
      console.error("Error marking video as viewed:", error);
      // Revert optimistic update on error
      setViewedVideoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  }, [user]);

  // Check if a video has been viewed
  const isVideoViewed = useCallback((videoId: string) => {
    return viewedVideoIds.has(videoId);
  }, [viewedVideoIds]);

  return {
    viewedVideoIds,
    loading,
    markVideoAsViewed,
    isVideoViewed,
    refreshViewedVideos: fetchViewedVideos,
  };
};
