import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RedditVideo {
  id: string;
  reddit_url: string;
  title: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// Hook for members - only active videos
export const useRedditFeedVideos = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["reddit-feed-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reddit_videos")
        .select("*")
        .is("group_id", null)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as RedditVideo[];
    },
  });
  return { videos: data || [], isLoading };
};

// Hook for admin - all videos
export const useRedditAdmin = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reddit-admin-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reddit_videos")
        .select("*")
        .is("group_id", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as RedditVideo[];
    },
  });

  const addVideo = useMutation({
    mutationFn: async ({ url, title }: { url: string; title?: string }) => {
      const maxOrder = (data || []).reduce((max, v) => Math.max(max, v.display_order), -1);
      const { error } = await supabase.from("reddit_videos").insert({
        reddit_url: url,
        title: title || null,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["reddit-feed-videos"] });
      toast.success("Reddit URL added");
    },
    onError: () => toast.error("Failed to add URL"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("reddit_videos")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["reddit-feed-videos"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reddit_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["reddit-feed-videos"] });
      toast.success("Reddit URL removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  return {
    videos: data || [],
    isLoading,
    addVideo,
    toggleActive,
    deleteVideo,
  };
};
