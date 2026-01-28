import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

interface UserPresenceData {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Update presence in database
  const updatePresenceInDb = useCallback(async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) {
        console.error("Error updating presence:", error);
      }
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
  }, [user]);

  // Fetch last seen data for specific users
  // NOTE: This only fetches last_seen timestamps, NOT is_online status
  // The is_online status should come from the Realtime Presence channel
  const fetchLastSeen = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from("user_presence")
        .select("user_id, last_seen_at")
        .in("user_id", userIds);

      if (error) {
        console.error("Error fetching last seen:", error);
        return;
      }

      if (data) {
        const newLastSeenMap = new Map(lastSeenMap);

        data.forEach((presence: { user_id: string; last_seen_at: string }) => {
          newLastSeenMap.set(presence.user_id, presence.last_seen_at);
        });

        setLastSeenMap(newLastSeenMap);
        // Don't update onlineUsers here - let Realtime Presence handle that
      }
    } catch (err) {
      console.error("Failed to fetch last seen:", err);
    }
  }, [lastSeenMap]);

  // Track current user's presence with Realtime
  useEffect(() => {
    if (!user) return;

    // Set user as online when component mounts
    updatePresenceInDb(true);

    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const online = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          online.add(key);
        });
        
        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        // Update last seen when user goes offline
        setLastSeenMap((prev) => {
          const next = new Map(prev);
          next.set(key, new Date().toISOString());
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Subscribe to presence table changes
    const dbChannel = supabase
      .channel("presence-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "user_id" in payload.new) {
            const presence = payload.new as UserPresenceData;
            setLastSeenMap((prev) => {
              const next = new Map(prev);
              next.set(presence.user_id, presence.last_seen_at);
              return next;
            });
            setOnlineUsers((prev) => {
              const next = new Set(prev);
              if (presence.is_online) {
                next.add(presence.user_id);
              } else {
                next.delete(presence.user_id);
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresenceInDb(false);
      } else {
        updatePresenceInDb(true);
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline update
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`;
      const data = JSON.stringify({
        is_online: false,
        last_seen_at: new Date().toISOString(),
      });
      
      navigator.sendBeacon && navigator.sendBeacon(url, new Blob([data], { type: "application/json" }));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      updatePresenceInDb(false);
      presenceChannel.unsubscribe();
      dbChannel.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, updatePresenceInDb]);

  // Check if a specific user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Get last seen timestamp for a user
  const getLastSeen = useCallback(
    (userId: string) => {
      return lastSeenMap.get(userId) || null;
    },
    [lastSeenMap]
  );

  // Get count of online users from a list
  const getOnlineCount = useCallback(
    (userIds: string[]) => {
      return userIds.filter((id) => onlineUsers.has(id)).length;
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    isUserOnline,
    getLastSeen,
    getOnlineCount,
    fetchLastSeen,
    totalOnline: onlineUsers.size,
  };
};
