import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const useFavorites = (targetUserId?: string) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Check if a specific user is favorited
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !targetUserId || user.id === targetUserId) return;

      const { data } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("favorite_user_id", targetUserId)
        .maybeSingle();

      setIsFavorite(!!data);
    };

    checkFavoriteStatus();
  }, [user, targetUserId]);

  // Fetch all favorites for the current user
  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_favorites")
      .select("favorite_user_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setFavorites(data.map((f) => f.favorite_user_id));
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    setLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("favorite_user_id", targetUserId);

        if (error) throw error;

        setIsFavorite(false);
        setFavorites((prev) => prev.filter((id) => id !== targetUserId));
        toast({
          title: t("favorites.removed", { defaultValue: "Removed from favorites" }),
          description: t("favorites.removedDesc", { defaultValue: "User removed from your favorites list." }),
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("user_favorites")
          .insert({
            user_id: user.id,
            favorite_user_id: targetUserId,
          });

        if (error) throw error;

        setIsFavorite(true);
        setFavorites((prev) => [...prev, targetUserId]);
        toast({
          title: t("favorites.added", { defaultValue: "Added to favorites" }),
          description: t("favorites.addedDesc", { defaultValue: "User added to your favorites list." }),
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: t("common.error", { defaultValue: "Error" }),
        description: t("favorites.error", { defaultValue: "Failed to update favorites. Please try again." }),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isUserFavorite = useCallback(
    (userId: string) => favorites.includes(userId),
    [favorites]
  );

  return {
    isFavorite,
    loading,
    toggleFavorite,
    favorites,
    isUserFavorite,
    refetchFavorites: fetchFavorites,
  };
};
