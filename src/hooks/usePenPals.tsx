import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PenPalProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  location: string | null;
  is_verified: boolean;
  interests?: string[];
  looking_for_description?: string;
  mutual_friends_count?: number;
}

export interface PenPalConnection {
  id: string;
  user_id: string;
  penpal_id: string;
  created_at: string;
  penpal_profile?: PenPalProfile;
}

export interface PenPalPreferences {
  is_discoverable: boolean;
  preferred_countries: string[];
  looking_for_description: string;
  interests: string[];
}

export const usePenPals = () => {
  const { user } = useAuth();
  const [discoverProfiles, setDiscoverProfiles] = useState<PenPalProfile[]>([]);
  const [myConnections, setMyConnections] = useState<PenPalConnection[]>([]);
  const [myPreferences, setMyPreferences] = useState<PenPalPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchDiscoverProfiles = useCallback(async () => {
    if (!user) return;

    try {
      // Get existing connections and blocked users
      const [connectionsRes, blockedRes] = await Promise.all([
        supabase
          .from("penpal_connections")
          .select("penpal_id, user_id")
          .or(`user_id.eq.${user.id},penpal_id.eq.${user.id}`),
        supabase
          .from("blocked_users")
          .select("blocked_user_id")
          .eq("user_id", user.id)
      ]);

      const connectedIds = new Set<string>();
      connectionsRes.data?.forEach((c) => {
        connectedIds.add(c.user_id);
        connectedIds.add(c.penpal_id);
      });

      const blockedIds = new Set(blockedRes.data?.map((b) => b.blocked_user_id) || []);

      // Get discoverable users with preferences
      const { data: prefsData } = await supabase
        .from("penpal_preferences")
        .select("user_id, interests, looking_for_description")
        .eq("is_discoverable", true)
        .neq("user_id", user.id);

      const userIdsWithPrefs = new Set(prefsData?.map((p) => p.user_id) || []);

      // Fetch profiles from safe_profiles
      const { data: profiles, error } = await supabase
        .from("safe_profiles")
        .select("user_id, username, display_name, first_name, last_name, avatar_url, bio, country, location, is_verified")
        .neq("user_id", user.id)
        .limit(50);

      if (error) throw error;

      // Filter and enrich profiles
      const enrichedProfiles: PenPalProfile[] = (profiles || [])
        .filter((p) => !connectedIds.has(p.user_id) && !blockedIds.has(p.user_id))
        .map((p) => {
          const prefs = prefsData?.find((pref) => pref.user_id === p.user_id);
          return {
            ...p,
            interests: prefs?.interests || [],
            looking_for_description: prefs?.looking_for_description || undefined,
          };
        })
        // Shuffle for random discovery
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      setDiscoverProfiles(enrichedProfiles);
    } catch (error) {
      console.error("Error fetching discover profiles:", error);
    }
  }, [user]);

  const fetchMyConnections = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("penpal_connections")
        .select("*")
        .or(`user_id.eq.${user.id},penpal_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get all penpal user IDs (the other person in each connection)
      const penpalIds = (data || []).map((c) => 
        c.user_id === user.id ? c.penpal_id : c.user_id
      );

      if (penpalIds.length === 0) {
        setMyConnections([]);
        return;
      }

      // Fetch profiles for all penpals
      const { data: profiles } = await supabase
        .from("safe_profiles")
        .select("user_id, username, display_name, first_name, last_name, avatar_url, bio, country, location, is_verified")
        .in("user_id", penpalIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const connectionsWithProfiles: PenPalConnection[] = (data || []).map((c) => {
        const penpalId = c.user_id === user.id ? c.penpal_id : c.user_id;
        return {
          ...c,
          penpal_profile: profileMap.get(penpalId) || undefined,
        };
      });

      setMyConnections(connectionsWithProfiles);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  }, [user]);

  const fetchMyPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("penpal_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMyPreferences({
          is_discoverable: data.is_discoverable ?? true,
          preferred_countries: data.preferred_countries || [],
          looking_for_description: data.looking_for_description || "",
          interests: data.interests || [],
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  }, [user]);

  const connectWithPenPal = async (penpalId: string) => {
    if (!user) return false;

    setConnecting(penpalId);
    try {
      const { error } = await supabase.from("penpal_connections").insert({
        user_id: user.id,
        penpal_id: penpalId,
      });

      if (error) throw error;

      toast.success("Connected! You're now pen pals.");
      
      // Remove from discover list
      setDiscoverProfiles((prev) => prev.filter((p) => p.user_id !== penpalId));
      
      // Refresh connections
      await fetchMyConnections();
      return true;
    } catch (error: any) {
      console.error("Error connecting:", error);
      if (error.code === "23505") {
        toast.error("Already connected with this person");
      } else {
        toast.error("Failed to connect");
      }
      return false;
    } finally {
      setConnecting(null);
    }
  };

  const disconnectPenPal = async (connectionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("penpal_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast.success("Disconnected from pen pal");
      setMyConnections((prev) => prev.filter((c) => c.id !== connectionId));
      return true;
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
      return false;
    }
  };

  const updatePreferences = async (prefs: Partial<PenPalPreferences>) => {
    if (!user) return false;

    try {
      // IMPORTANT: penpal_preferences enforces uniqueness on user_id.
      // If we upsert without specifying the conflict target, PostgREST may default
      // to the table primary key instead of the user_id unique constraint, causing
      // a duplicate key error when a row already exists.
      const payload = {
        user_id: user.id,
        ...(myPreferences ?? {}),
        ...prefs,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("penpal_preferences")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setMyPreferences((prev) => prev ? { ...prev, ...prefs } : null);
      toast.success("Preferences updated");
      return true;
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDiscoverProfiles(),
        fetchMyConnections(),
        fetchMyPreferences(),
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchDiscoverProfiles, fetchMyConnections, fetchMyPreferences]);

  // Realtime subscription for connections
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("penpal_connections_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "penpal_connections",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMyConnections();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "penpal_connections",
          filter: `penpal_id=eq.${user.id}`,
        },
        () => {
          fetchMyConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMyConnections]);

  return {
    discoverProfiles,
    myConnections,
    myPreferences,
    loading,
    connecting,
    connectWithPenPal,
    disconnectPenPal,
    updatePreferences,
    refreshDiscover: fetchDiscoverProfiles,
  };
};
