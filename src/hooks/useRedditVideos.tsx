import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RedditVideo {
  id: string;
  group_id: string;
  reddit_url: string;
  thumbnail_url: string | null;
  title: string | null;
  media_type: string | null;
  display_order: number;
  created_at: string;
}

export interface RedditVideoGroup {
  id: string;
  title: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  videos?: RedditVideo[];
}

export const useRedditAdmin = () => {
  const queryClient = useQueryClient();

  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ["reddit-video-groups-admin"],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from("reddit_video_groups")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      const { data: videos, error: videosError } = await supabase
        .from("reddit_videos")
        .select("*")
        .order("display_order", { ascending: true });

      if (videosError) throw videosError;

      return (groups as RedditVideoGroup[]).map((group) => ({
        ...group,
        videos: (videos as RedditVideo[]).filter((v) => v.group_id === group.id),
      }));
    },
  });

  const createGroup = useMutation({
    mutationFn: async (title?: string) => {
      const { error } = await supabase
        .from("reddit_video_groups")
        .insert({ title: title || null, display_order: allGroups.length });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-video-groups-admin"] });
      toast.success("Reddit video group created");
    },
    onError: () => toast.error("Failed to create group"),
  });

  const updateGroup = useMutation({
    mutationFn: async (params: { id: string; is_active?: boolean; title?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("reddit_video_groups")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-video-groups-admin"] });
    },
    onError: () => toast.error("Failed to update group"),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reddit_video_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-video-groups-admin"] });
      toast.success("Group deleted");
    },
    onError: () => toast.error("Failed to delete group"),
  });

  const addVideo = useMutation({
    mutationFn: async (params: { group_id: string; reddit_url: string }) => {
      const group = allGroups.find((g) => g.id === params.group_id);
      const order = group?.videos?.length || 0;
      const { error } = await supabase
        .from("reddit_videos")
        .insert({
          group_id: params.group_id,
          reddit_url: params.reddit_url,
          display_order: order,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-video-groups-admin"] });
      toast.success("Reddit link added");
    },
    onError: () => toast.error("Failed to add Reddit link"),
  });

  const removeVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reddit_videos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reddit-video-groups-admin"] });
      toast.success("Reddit link removed");
    },
    onError: () => toast.error("Failed to remove Reddit link"),
  });

  return { allGroups, isLoading, createGroup, updateGroup, deleteGroup, addVideo, removeVideo };
};
