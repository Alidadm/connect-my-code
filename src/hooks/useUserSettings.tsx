import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserSettings {
  dark_mode: boolean;
  compact_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  friend_request_notifications: boolean;
  birthday_reminders: boolean;
  notification_sound: boolean;
  message_sound: boolean;
  language: string;
}

const defaultSettings: UserSettings = {
  dark_mode: false,
  compact_mode: false,
  push_notifications: true,
  email_notifications: true,
  friend_request_notifications: true,
  birthday_reminders: true,
  notification_sound: true,
  message_sound: true,
  language: "en",
};

// Apply dark mode class to document
const applyDarkMode = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// Apply compact mode class to document
const applyCompactMode = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.add("compact");
  } else {
    document.documentElement.classList.remove("compact");
  }
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Apply settings to DOM whenever they change
  useEffect(() => {
    applyDarkMode(settings.dark_mode);
    applyCompactMode(settings.compact_mode);
  }, [settings.dark_mode, settings.compact_mode]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const newSettings = {
          dark_mode: data.dark_mode ?? defaultSettings.dark_mode,
          compact_mode: data.compact_mode ?? defaultSettings.compact_mode,
          push_notifications: data.push_notifications ?? defaultSettings.push_notifications,
          email_notifications: data.email_notifications ?? defaultSettings.email_notifications,
          friend_request_notifications: data.friend_request_notifications ?? defaultSettings.friend_request_notifications,
          birthday_reminders: data.birthday_reminders ?? defaultSettings.birthday_reminders,
          notification_sound: data.notification_sound ?? defaultSettings.notification_sound,
          message_sound: data.message_sound ?? defaultSettings.message_sound,
          language: data.language ?? defaultSettings.language,
        };
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, ...newSettings });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
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
