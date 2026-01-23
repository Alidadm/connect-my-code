import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { supportedLanguages, type LanguageCode } from "@/lib/i18n";

/**
 * Custom hook for managing language with proper persistence and sync.
 * Ensures all components re-render when language changes.
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Get current language info
  const currentLanguage = supportedLanguages.find(
    (l) => l.code === i18n.language
  ) || supportedLanguages[0];

  /**
   * Change language with full app sync.
   * - Updates i18n instance
   * - Persists to localStorage
   * - Saves to database for logged-in users
   * - Forces document update for RTL languages
   */
  const changeLanguage = useCallback(
    async (langCode: LanguageCode) => {
      try {
        // 1. Change i18n language (triggers re-render for components using useTranslation)
        await i18n.changeLanguage(langCode);

        // 2. Persist to localStorage for immediate next load
        localStorage.setItem("i18nextLng", langCode);

        // 3. Update document attributes for RTL support
        const lang = supportedLanguages.find((l) => l.code === langCode);
        if (lang) {
          document.documentElement.lang = langCode;
          document.documentElement.dir = langCode === "ar" ? "rtl" : "ltr";
        }

        // 4. Save to database for logged-in users
        if (user) {
          const { data: existing } = await supabase
            .from("user_settings")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("user_settings")
              .update({ language: langCode, updated_at: new Date().toISOString() })
              .eq("user_id", user.id);
          } else {
            await supabase.from("user_settings").insert({
              user_id: user.id,
              language: langCode,
            });
          }
        }

        // 5. Dispatch custom event for any components that need to manually respond
        window.dispatchEvent(new CustomEvent("languageChanged", { detail: langCode }));

        return true;
      } catch (error) {
        console.error("Failed to change language:", error);
        toast.error("Failed to change language");
        return false;
      }
    },
    [i18n, user]
  );

  // Sync language on mount and when user logs in
  useEffect(() => {
    const syncLanguage = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_settings")
            .select("language")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!error && data?.language && data.language !== i18n.language) {
            await i18n.changeLanguage(data.language);
            localStorage.setItem("i18nextLng", data.language);
            document.documentElement.lang = data.language;
            document.documentElement.dir = data.language === "ar" ? "rtl" : "ltr";
          }
        } catch (error) {
          console.error("Error syncing language:", error);
        }
      }
    };

    syncLanguage();
  }, [user, i18n]);

  return {
    currentLanguage,
    currentCode: i18n.language as LanguageCode,
    changeLanguage,
    supportedLanguages,
    isRTL: i18n.language === "ar",
  };
};
