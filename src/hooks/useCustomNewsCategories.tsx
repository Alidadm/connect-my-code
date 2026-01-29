import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CustomCategory {
  id: string;
  name: string;
  keywords: string;
  icon: string;
  color: string;
  created_at: string;
}

interface CustomNewsItem {
  id: string;
  custom_category_id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  image_url: string | null;
  published_at: string;
  expires_at: string;
}

const MAX_CUSTOM_CATEGORIES = 4;

export const useCustomNewsCategories = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customNewsItems, setCustomNewsItems] = useState<CustomNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(false);

  // Fetch user's custom categories
  const fetchCustomCategories = useCallback(async () => {
    if (!user) {
      setCustomCategories([]);
      return;
    }

    const { data, error } = await supabase
      .from("user_custom_news_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching custom categories:", error);
      return;
    }

    setCustomCategories(data || []);
  }, [user]);

  // Fetch news items for all custom categories
  const fetchCustomNews = useCallback(async () => {
    if (!user || customCategories.length === 0) {
      setCustomNewsItems([]);
      return;
    }

    setLoadingNews(true);

    const categoryIds = customCategories.map((c) => c.id);
    const { data, error } = await supabase
      .from("user_custom_news_items")
      .select("*")
      .in("custom_category_id", categoryIds)
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching custom news:", error);
      setLoadingNews(false);
      return;
    }

    setCustomNewsItems(data || []);
    setLoadingNews(false);
  }, [user, customCategories]);

  // Create a new custom category
  const createCustomCategory = async (name: string, keywords: string, icon?: string, color?: string) => {
    if (!user) return null;

    if (customCategories.length >= MAX_CUSTOM_CATEGORIES) {
      toast.error(t("news.maxCustomCategoriesReached", "You can only create up to 4 custom categories"));
      return null;
    }

    const { data, error } = await supabase
      .from("user_custom_news_categories")
      .insert({
        user_id: user.id,
        name: name.trim(),
        keywords: keywords.trim(),
        icon: icon || "📰",
        color: color || "#6366f1",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating custom category:", error);
      toast.error(t("news.errorCreatingCategory", "Failed to create category"));
      return null;
    }

    setCustomCategories((prev) => [data, ...prev]);
    toast.success(t("news.categoryCreated", "Custom category created"));

    // Trigger news fetch for this category
    refreshCategoryNews(data.id);

    return data;
  };

  // Update a custom category
  const updateCustomCategory = async (id: string, updates: Partial<Pick<CustomCategory, "name" | "keywords" | "icon" | "color">>) => {
    if (!user) return false;

    const { error } = await supabase
      .from("user_custom_news_categories")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating custom category:", error);
      toast.error(t("news.errorUpdatingCategory", "Failed to update category"));
      return false;
    }

    setCustomCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    toast.success(t("news.categoryUpdated", "Category updated"));

    // Refresh news if keywords changed
    if (updates.keywords) {
      refreshCategoryNews(id);
    }

    return true;
  };

  // Delete a custom category
  const deleteCustomCategory = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("user_custom_news_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting custom category:", error);
      toast.error(t("news.errorDeletingCategory", "Failed to delete category"));
      return false;
    }

    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
    setCustomNewsItems((prev) => prev.filter((n) => n.custom_category_id !== id));
    toast.success(t("news.categoryDeleted", "Category deleted"));
    return true;
  };

  // Refresh news for a specific category
  const refreshCategoryNews = async (categoryId: string) => {
    try {
      const { error } = await supabase.functions.invoke("fetch-custom-news", {
        body: { category_id: categoryId },
      });

      if (error) {
        console.error("Error refreshing category news:", error);
      } else {
        // Refetch news items after a short delay
        setTimeout(() => fetchCustomNews(), 2000);
      }
    } catch (err) {
      console.error("Error invoking fetch-custom-news:", err);
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCustomCategories();
      setLoading(false);
    };
    load();
  }, [fetchCustomCategories]);

  // Fetch news when categories change
  useEffect(() => {
    if (customCategories.length > 0) {
      fetchCustomNews();
    }
  }, [customCategories, fetchCustomNews]);

  // Group news by category
  const customNewsByCategory = customNewsItems.reduce((acc, item) => {
    const catId = item.custom_category_id;
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(item);
    return acc;
  }, {} as Record<string, CustomNewsItem[]>);

  return {
    customCategories,
    customNewsItems,
    customNewsByCategory,
    loading,
    loadingNews,
    createCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    refreshCategoryNews,
    refetchCustomNews: fetchCustomNews,
    maxCustomCategories: MAX_CUSTOM_CATEGORIES,
  };
};
