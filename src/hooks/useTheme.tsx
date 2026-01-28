import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Theme {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  is_default: boolean;
  sort_order: number;
}

interface ThemeContextType {
  themes: Theme[];
  selectedTheme: Theme | null;
  loading: boolean;
  selectTheme: (themeId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Apply theme CSS class to document
const applyThemeClass = (slug: string | null) => {
  // Remove all theme classes
  document.documentElement.classList.remove("theme-blue", "theme-all-colors");
  
  // Add the selected theme class
  if (slug === "all-colors") {
    document.documentElement.classList.add("theme-all-colors");
  } else {
    document.documentElement.classList.add("theme-blue");
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch available themes
  const fetchThemes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("template_themes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setThemes(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching themes:", error);
      return [];
    }
  }, []);

  // Fetch user's selected theme
  const fetchUserTheme = useCallback(async (availableThemes: Theme[]) => {
    if (!user) {
      // Default to blue theme for non-authenticated users
      const defaultTheme = availableThemes.find(t => t.is_default) || availableThemes[0];
      setSelectedTheme(defaultTheme);
      applyThemeClass(defaultTheme?.slug || "blue");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("selected_theme_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      let theme: Theme | null = null;
      
      if (data?.selected_theme_id) {
        theme = availableThemes.find(t => t.id === data.selected_theme_id) || null;
      }
      
      // Fall back to default theme
      if (!theme) {
        theme = availableThemes.find(t => t.is_default) || availableThemes[0] || null;
      }

      setSelectedTheme(theme);
      applyThemeClass(theme?.slug || "blue");
    } catch (error) {
      console.error("Error fetching user theme:", error);
      const defaultTheme = availableThemes.find(t => t.is_default) || availableThemes[0];
      setSelectedTheme(defaultTheme);
      applyThemeClass(defaultTheme?.slug || "blue");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const availableThemes = await fetchThemes();
      await fetchUserTheme(availableThemes);
    };
    init();
  }, [fetchThemes, fetchUserTheme]);

  const selectTheme = async (themeId: string) => {
    if (!user) return;

    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    // Optimistically update
    setSelectedTheme(theme);
    applyThemeClass(theme.slug);

    try {
      // Check if user_settings exists
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({ selected_theme_id: themeId, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, selected_theme_id: themeId });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving theme:", error);
      // Revert on error
      const defaultTheme = themes.find(t => t.is_default) || themes[0];
      setSelectedTheme(defaultTheme);
      applyThemeClass(defaultTheme?.slug || "blue");
    }
  };

  return (
    <ThemeContext.Provider value={{ themes, selectedTheme, loading, selectTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
