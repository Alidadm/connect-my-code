import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  actor_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set((data || []).map(n => n.actor_id).filter(Boolean))] as string[];
      let actorProfiles: Record<string, any> = {};

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("safe_profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", actorIds);

        if (profiles) {
          actorProfiles = Object.fromEntries(profiles.map(p => [p.user_id, p]));
        }
      }

      return (data || []).map(n => ({
        ...n,
        actor_profile: n.actor_id ? actorProfiles[n.actor_id] : undefined,
      })) as Notification[];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  }, [user, queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  }, [user, queryClient]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  }, [user, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
