import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ShortVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
}

export const useViewedShortVideos = () => {
  const { user } = useAuth();
  const [viewedVideoIds, setViewedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all viewed short video IDs for current user
  const fetchViewedVideos = useCallback(async () => {
    if (!user) {
      setViewedVideoIds(new Set());
      setLoading(false);
      return;
    }

    try {
      // Use type assertion since the table was just created and types aren't regenerated yet
      const { data, error } = await (supabase
        .from("viewed_short_videos" as any)
        .select("short_video_id")
        .eq("user_id", user.id) as any);

      if (error) {
        console.log("viewed_short_videos query error:", error.message);
        setViewedVideoIds(new Set());
      } else {
        setViewedVideoIds(new Set((data as any[])?.map(v => v.short_video_id) || []));
      }
    } catch (error) {
      console.error("Error fetching viewed short videos:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchViewedVideos();
  }, [fetchViewedVideos]);

  // Mark a short video as viewed
  const markVideoAsViewed = useCallback(async (videoId: string) => {
    if (!user || !videoId) return;

    // Optimistic update
    setViewedVideoIds(prev => new Set([...prev, videoId]));

    try {
      // Use type assertion for the new table
      const { error } = await (supabase
        .from("viewed_short_videos" as any)
        .upsert(
          { user_id: user.id, short_video_id: videoId },
          { onConflict: "user_id,short_video_id" }
        ) as any);

      if (error) {
        console.error("Error marking video as viewed:", error);
        // Revert optimistic update on error
        setViewedVideoIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error marking video as viewed:", error);
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

  // Get random unviewed videos from a list
  const getRandomUnviewedVideos = useCallback((videos: ShortVideo[], count: number = 5): ShortVideo[] => {
    // Filter out viewed videos
    const unviewedVideos = videos.filter(v => !viewedVideoIds.has(v.id));
    
    // If no unviewed videos left, show random from all (reset behavior)
    const sourceVideos = unviewedVideos.length > 0 ? unviewedVideos : videos;
    
    // Shuffle and return random selection
    const shuffled = [...sourceVideos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [viewedVideoIds]);

  return {
    viewedVideoIds,
    loading,
    markVideoAsViewed,
    isVideoViewed,
    getRandomUnviewedVideos,
    refreshViewedVideos: fetchViewedVideos,
  };
};
