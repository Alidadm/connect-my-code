import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UseFollowReturn {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  toggleFollow: () => Promise<void>;
}

export const useFollow = (targetUserId: string | undefined): UseFollowReturn => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch follow status and counts
  const fetchFollowData = useCallback(async () => {
    if (!targetUserId) return;

    try {
      // Fetch profile counts
      const { data: profileData } = await supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("user_id", targetUserId)
        .single();

      if (profileData) {
        setFollowersCount(profileData.followers_count || 0);
        setFollowingCount(profileData.following_count || 0);
      }

      // Check if current user is following this user
      if (user && user.id !== targetUserId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error("Error fetching follow data:", error);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    fetchFollowData();
  }, [fetchFollowData]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`follows-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
          filter: `following_id=eq.${targetUserId}`,
        },
        () => {
          fetchFollowData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, fetchFollowData]);

  const toggleFollow = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) {
      if (!user) {
        toast.error(t("common.loginRequired", "Please log in to follow users"));
      }
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        if (error) throw error;
        
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(prev - 1, 0));
        toast.success(t("follow.unfollowed", "Unfollowed successfully"));
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

        if (error) throw error;
        
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast.success(t("follow.followed", "Now following"));
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error(t("common.error", "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId, isFollowing, t]);

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
  };
};
