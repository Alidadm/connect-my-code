import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
}

interface NewsItem {
  id: string;
  category_id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  image_url: string | null;
  published_at: string;
  expires_at: string;
  category?: NewsCategory;
}

const MAX_USER_CATEGORIES = 6;

export const useNews = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(false);

  // Fetch all available categories
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("news_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching news categories:", error);
      return;
    }

    setCategories(data || []);
  }, []);

  // Fetch user's selected categories
  const fetchUserCategories = useCallback(async () => {
    if (!user) {
      setUserCategories([]);
      return;
    }

    const { data, error } = await supabase
      .from("user_news_preferences")
      .select("category_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user news preferences:", error);
      return;
    }

    setUserCategories(data?.map((p) => p.category_id) || []);
  }, [user]);

  // Fetch news items for user's selected categories
  const fetchNews = useCallback(async () => {
    if (!user || userCategories.length === 0) {
      setNewsItems([]);
      return;
    }

    setLoadingNews(true);

    const { data, error } = await supabase
      .from("news_items")
      .select(`
        *,
        category:news_categories(*)
      `)
      .in("category_id", userCategories)
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching news items:", error);
      setLoadingNews(false);
      return;
    }

    setNewsItems(data || []);
    setLoadingNews(false);
  }, [user, userCategories]);

  // Toggle category selection
  const toggleCategory = async (categoryId: string) => {
    if (!user) return;

    const isSelected = userCategories.includes(categoryId);

    if (isSelected) {
      // Remove category
      const { error } = await supabase
        .from("user_news_preferences")
        .delete()
        .eq("user_id", user.id)
        .eq("category_id", categoryId);

      if (error) {
        console.error("Error removing category:", error);
        toast.error(t("news.errorRemovingCategory", "Failed to remove category"));
        return;
      }

      setUserCategories((prev) => prev.filter((id) => id !== categoryId));
      toast.success(t("news.categoryRemoved", "Category removed"));
    } else {
      // Check max limit
      if (userCategories.length >= MAX_USER_CATEGORIES) {
        toast.error(
          t("news.maxCategoriesReached", "You can only select up to 6 categories")
        );
        return;
      }

      // Add category
      const { error } = await supabase
        .from("user_news_preferences")
        .insert({ user_id: user.id, category_id: categoryId });

      if (error) {
        console.error("Error adding category:", error);
        toast.error(t("news.errorAddingCategory", "Failed to add category"));
        return;
      }

      setUserCategories((prev) => [...prev, categoryId]);
      toast.success(t("news.categoryAdded", "Category added"));
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchCategories();
      await fetchUserCategories();
      setLoading(false);
    };
    load();
  }, [fetchCategories, fetchUserCategories]);

  // Fetch news when user categories change
  useEffect(() => {
    if (userCategories.length > 0) {
      fetchNews();
    } else {
      setNewsItems([]);
    }
  }, [userCategories, fetchNews]);

  // Group news by category
  const newsByCategory = newsItems.reduce((acc, item) => {
    const catId = item.category_id;
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);

  return {
    categories,
    userCategories,
    newsItems,
    newsByCategory,
    loading,
    loadingNews,
    toggleCategory,
    refetchNews: fetchNews,
    maxCategories: MAX_USER_CATEGORIES,
  };
};
