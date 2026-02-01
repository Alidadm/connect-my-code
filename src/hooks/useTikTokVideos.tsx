import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TikTokVideo {
  id: string;
  group_id: string;
  tiktok_url: string;
  tiktok_video_id: string | null;
  thumbnail_url: string | null;
  video_title: string | null;
  author_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface TikTokVideoGroup {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
  sort_order: number;
  videos?: TikTokVideo[];
}

export const useTikTokVideos = () => {
  const queryClient = useQueryClient();

  // Fetch all active video groups with their videos
  const { data: videoGroups = [], isLoading } = useQuery({
    queryKey: ["tiktok-video-groups"],
    queryFn: async () => {
      const { data: groups, error: groupsError } = await supabase
        .from("tiktok_video_groups")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch videos for each group
      const groupsWithVideos = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: videos } = await supabase
            .from("tiktok_videos")
            .select("*")
            .eq("group_id", group.id)
            .order("sort_order", { ascending: true })
            .limit(10);

          return {
            ...group,
            videos: videos || [],
          } as TikTokVideoGroup;
        })
      );

      // Filter out empty groups
      return groupsWithVideos.filter((g) => g.videos && g.videos.length > 0);
    },
  });

  return {
    videoGroups,
    isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] }),
  };
};

// Admin hook for managing TikTok videos
export const useTikTokAdmin = () => {
  const queryClient = useQueryClient();

  // Fetch all video groups (including inactive) for admin
  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ["tiktok-video-groups-admin"],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from("tiktok_video_groups")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Fetch videos for each group
      const groupsWithVideos = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: videos } = await supabase
            .from("tiktok_videos")
            .select("*")
            .eq("group_id", group.id)
            .order("sort_order", { ascending: true });

          return {
            ...group,
            videos: videos || [],
          } as TikTokVideoGroup;
        })
      );

      return groupsWithVideos;
    },
  });

  // Create a new video group
  const createGroup = useMutation({
    mutationFn: async (title?: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tiktok_video_groups")
        .insert({
          title: title || null,
          created_by: user.user?.id,
          sort_order: allGroups.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
      toast.success("Video group created");
    },
    onError: (error) => {
      toast.error("Failed to create group: " + error.message);
    },
  });

  // Update group
  const updateGroup = useMutation({
    mutationFn: async ({ id, title, is_active }: { id: string; title?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("tiktok_video_groups")
        .update({ title, is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
    },
  });

  // Delete group
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tiktok_video_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
      toast.success("Video group deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete group: " + error.message);
    },
  });

  // Add video to group
  const addVideo = useMutation({
    mutationFn: async ({ group_id, tiktok_url }: { group_id: string; tiktok_url: string }) => {
      // Check if group already has 10 videos
      const { count } = await supabase
        .from("tiktok_videos")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group_id);

      if (count && count >= 10) {
        throw new Error("Maximum 10 videos per group");
      }

      const { data, error } = await supabase
        .from("tiktok_videos")
        .insert({
          group_id,
          tiktok_url,
          sort_order: count || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
      toast.success("Video added");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove video
  const removeVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tiktok_videos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
      toast.success("Video removed");
    },
    onError: (error) => {
      toast.error("Failed to remove video: " + error.message);
    },
  });

  return {
    allGroups,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    addVideo,
    removeVideo,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tiktok-video-groups"] });
    },
  };
};
