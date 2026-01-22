import { useState, useEffect } from "react";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface FavoriteUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export const FavoritesSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      try {
        // Get favorite user IDs
        const { data: favData, error: favError } = await supabase
          .from("user_favorites")
          .select("favorite_user_id")
          .eq("user_id", user.id);

        if (favError) throw favError;

        if (!favData || favData.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }

        const favoriteIds = favData.map((f) => f.favorite_user_id);

        // Get profiles for favorites
        const { data: profiles, error: profileError } = await supabase
          .from("safe_profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", favoriteIds);

        if (profileError) throw profileError;

        setFavorites(profiles || []);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    // Subscribe to changes
    if (user) {
      const channel = supabase
        .channel("favorites-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_favorites",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchFavorites();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-yellow-500" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-sm">
            {t("favorites.title", { defaultValue: "Favorites" })}
          </span>
          <span className="text-xs text-muted-foreground">({favorites.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-1">
          {favorites.slice(0, 5).map((fav) => (
            <Button
              key={fav.user_id}
              variant="ghost"
              className="w-full justify-start gap-2 h-10 px-2"
              onClick={() => navigate(`/${fav.username}`)}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={fav.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {fav.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">
                {fav.display_name || fav.username}
              </span>
            </Button>
          ))}
          {favorites.length > 5 && (
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => navigate("/friends?tab=favorites")}
            >
              {t("favorites.viewAll", { defaultValue: "View all favorites" })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
