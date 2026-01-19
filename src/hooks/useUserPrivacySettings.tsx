import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPrivacySettings {
  show_online_status: boolean;
  show_last_seen: boolean;
  allow_direct_messages: boolean;
}

const defaultSettings: UserPrivacySettings = {
  show_online_status: true,
  show_last_seen: true,
  allow_direct_messages: true,
};

/**
 * Hook to fetch another user's privacy settings
 * Used to determine what to show/hide based on their preferences
 */
export const useUserPrivacySettings = (userId: string | undefined) => {
  const [settings, setSettings] = useState<UserPrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("privacy_settings")
          .select("show_online_status, show_last_seen, allow_direct_messages")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            show_online_status: data.show_online_status ?? defaultSettings.show_online_status,
            show_last_seen: data.show_last_seen ?? defaultSettings.show_last_seen,
            allow_direct_messages: data.allow_direct_messages ?? defaultSettings.allow_direct_messages,
          });
        }
      } catch (error) {
        console.error("Error fetching user privacy settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userId]);

  return { settings, loading };
};

/**
 * Batch fetch privacy settings for multiple users
 * Useful for lists like friends sidebar
 */
export const fetchBatchPrivacySettings = async (
  userIds: string[]
): Promise<Map<string, UserPrivacySettings>> => {
  const settingsMap = new Map<string, UserPrivacySettings>();
  
  if (userIds.length === 0) return settingsMap;

  try {
    const { data, error } = await supabase
      .from("privacy_settings")
      .select("user_id, show_online_status, show_last_seen, allow_direct_messages")
      .in("user_id", userIds);

    if (error) throw error;

    if (data) {
      data.forEach((row) => {
        settingsMap.set(row.user_id, {
          show_online_status: row.show_online_status ?? defaultSettings.show_online_status,
          show_last_seen: row.show_last_seen ?? defaultSettings.show_last_seen,
          allow_direct_messages: row.allow_direct_messages ?? defaultSettings.allow_direct_messages,
        });
      });
    }
  } catch (error) {
    console.error("Error fetching batch privacy settings:", error);
  }

  return settingsMap;
};
