import { useState, useEffect } from "react";
import { CalendarClock, Clock, ChevronLeft, ChevronRight, ImageIcon, Video, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  formatDistanceToNow,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ScheduledPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  scheduled_at: string;
  youtube_urls?: string[] | null;
  reddit_urls?: string[] | null;
}

export const ScheduledPostsTimeline = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchScheduled = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("posts")
        .select("id, content, media_urls, scheduled_at, youtube_urls, reddit_urls")
        .eq("user_id", user.id)
        .gt("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(50);

      setPosts(data || []);
      setLoading(false);
    };

    fetchScheduled();
  }, [user]);

  if (!user || loading) return null;
  if (posts.length === 0) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPostsForDay = (day: Date) =>
    posts.filter((p) => isSameDay(new Date(p.scheduled_at), day));

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  const getPostIcon = (post: ScheduledPost) => {
    if (post.media_urls?.some((u) => /\.(mp4|webm|mov)/i.test(u)))
      return <Video className="h-3 w-3" />;
    if (post.media_urls && post.media_urls.length > 0)
      return <ImageIcon className="h-3 w-3" />;
    if (post.youtube_urls && post.youtube_urls.length > 0)
      return <Video className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">
            {t("feed.scheduledTimeline", "Scheduled Posts Timeline")}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {posts.length}
          </Badge>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day) => {
          const dayPosts = getPostsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const hasScheduled = dayPosts.length > 0;

          return (
            <Popover key={day.toISOString()}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "relative flex flex-col items-center justify-center h-9 rounded-md text-xs transition-colors",
                    !inMonth && "text-muted-foreground/40",
                    inMonth && "text-foreground",
                    today && "font-bold ring-1 ring-primary/40",
                    isSelected && "bg-primary/15",
                    hasScheduled && "cursor-pointer hover:bg-secondary",
                    !hasScheduled && "cursor-default"
                  )}
                  onClick={() => hasScheduled && setSelectedDay(day)}
                  disabled={!hasScheduled}
                >
                  <span>{format(day, "d")}</span>
                  {hasScheduled && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayPosts.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className="h-1 w-1 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              {hasScheduled && (
                <PopoverContent
                  className="w-64 p-3 pointer-events-auto"
                  align="center"
                  side="bottom"
                >
                  <div className="text-xs font-semibold text-foreground mb-2">
                    {format(day, "EEEE, MMM d")}
                  </div>
                  <div className="space-y-2">
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-2 p-2 rounded-md bg-secondary/50"
                      >
                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-primary">
                          {getPostIcon(post)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">
                            {post.content
                              ? post.content.slice(0, 80) +
                                (post.content.length > 80 ? "…" : "")
                              : post.media_urls?.length
                                ? t("sidebar.mediaPost", "📷 Media post")
                                : t("sidebar.emptyPost", "Post")}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            <span>
                              {format(new Date(post.scheduled_at), "h:mm a")}
                            </span>
                            <span className="text-muted-foreground/60">
                              ·{" "}
                              {formatDistanceToNow(new Date(post.scheduled_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Upcoming list below calendar */}
      <div className="mt-4 border-t border-border pt-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {t("feed.upNext", "Up Next")}
        </h4>
        <div className="space-y-2">
          {posts.slice(0, 3).map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                {getPostIcon(post)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {post.content
                    ? post.content.slice(0, 50) +
                      (post.content.length > 50 ? "…" : "")
                    : post.media_urls?.length
                      ? t("sidebar.mediaPost", "📷 Media post")
                      : t("sidebar.emptyPost", "Post")}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  <span>
                    {format(new Date(post.scheduled_at), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
