import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PrivacySettings {
  profile_visibility: string;
  post_visibility: string;
  show_online_status: boolean;
  show_last_seen: boolean;
  hide_from_search: boolean;
  read_receipts: boolean;
  typing_indicator: boolean;
  login_alerts: boolean;
}

const defaultSettings: PrivacySettings = {
  profile_visibility: "everyone",
  post_visibility: "friends",
  show_online_status: true,
  show_last_seen: true,
  hide_from_search: false,
  read_receipts: true,
  typing_indicator: true,
  login_alerts: true,
};

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          profile_visibility: data.profile_visibility ?? defaultSettings.profile_visibility,
          post_visibility: data.post_visibility ?? defaultSettings.post_visibility,
          show_online_status: data.show_online_status ?? defaultSettings.show_online_status,
          show_last_seen: data.show_last_seen ?? defaultSettings.show_last_seen,
          hide_from_search: data.hide_from_search ?? defaultSettings.hide_from_search,
          read_receipts: data.read_receipts ?? defaultSettings.read_receipts,
          typing_indicator: data.typing_indicator ?? defaultSettings.typing_indicator,
          login_alerts: data.login_alerts ?? defaultSettings.login_alerts,
        });
      }
    } catch (error) {
      console.error("Error fetching privacy settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("privacy_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("privacy_settings")
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("privacy_settings")
          .insert({ user_id: user.id, ...newSettings });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast.error("Failed to save privacy settings");
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateSetting,
  };
};
