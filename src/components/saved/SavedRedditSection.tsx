import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SavedRedditItem {
  id: string;
  reddit_video_id: string;
  created_at: string;
  reddit_url: string;
}

export const SavedRedditSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedItems = [], isLoading } = useQuery({
    queryKey: ["saved-reddit-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: saved } = await supabase
        .from("saved_reddit_items")
        .select("id, reddit_video_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!saved || saved.length === 0) return [];

      const videoIds = saved.map((s) => s.reddit_video_id);
      const { data: videos } = await supabase
        .from("reddit_videos")
        .select("id, reddit_url")
        .in("id", videoIds);

      const urlMap = new Map(videos?.map((v) => [v.id, v.reddit_url]) || []);

      return saved
        .map((s) => ({
          ...s,
          reddit_url: urlMap.get(s.reddit_video_id) || "",
        }))
        .filter((s) => s.reddit_url);
    },
  });

  const handleRemove = async (id: string) => {
    await supabase.from("saved_reddit_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["saved-reddit-items"] });
    toast.success("Removed from saved");
  };

  if (isLoading || savedItems.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">r/</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("saved.redditItems", { defaultValue: "Saved Reddit" })}
        </h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {savedItems.length}
        </span>
      </div>
      <div className="space-y-4">
        {savedItems.map((item) => (
          <div key={item.id} className="relative">
            <RedditPreviewCard url={item.reddit_url} />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleRemove(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
