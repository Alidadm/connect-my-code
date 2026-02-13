import { useState, useEffect } from "react";
import { CalendarClock, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";

interface ScheduledPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  scheduled_at: string;
}

export const ScheduledPostsWidget = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchScheduled = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("posts")
        .select("id, content, media_urls, scheduled_at")
        .eq("user_id", user.id)
        .gt("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(5);

      setPosts(data || []);
      setLoading(false);
    };

    fetchScheduled();
  }, [user]);

  if (!user || loading || posts.length === 0) return null;

  return (
    <div className="rounded-xl p-4 border border-border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">
          {t("sidebar.scheduledPosts", "Scheduled Posts")}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {posts.length}
        </span>
      </div>

      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-start gap-3 p-2 -mx-1 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {post.content
                  ? post.content.slice(0, 60) + (post.content.length > 60 ? "…" : "")
                  : post.media_urls?.length
                    ? t("sidebar.mediaPost", "📷 Media post")
                    : t("sidebar.emptyPost", "Post")}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <CalendarClock className="h-3 w-3" />
                <span>
                  {format(new Date(post.scheduled_at), "MMM d, h:mm a")}
                </span>
                <span className="text-muted-foreground/60">
                  · {formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
