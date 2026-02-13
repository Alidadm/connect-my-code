import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RedditVideoGroup, RedditVideo } from "./useRedditVideos";

export const useRedditFeedVideos = () => {
  const { data: videoGroups = [], isLoading } = useQuery({
    queryKey: ["reddit-video-groups-feed"],
    queryFn: async () => {
      const { data: groups, error: groupsError } = await supabase
        .from("reddit_video_groups")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (groupsError) throw groupsError;

      const { data: videos, error: videosError } = await supabase
        .from("reddit_videos")
        .select("*")
        .order("display_order", { ascending: true });

      if (videosError) throw videosError;

      const groupsWithVideos = (groups || []).map((group) => ({
        ...group,
        videos: (videos as RedditVideo[]).filter((v) => v.group_id === group.id),
      })) as RedditVideoGroup[];

      return groupsWithVideos.filter((g) => g.videos && g.videos.length > 0);
    },
  });

  return { videoGroups, isLoading };
};
