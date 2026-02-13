import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRedditFeedVideos } from "@/hooks/useRedditFeedVideos";
import { RedditVideoCard } from "./RedditVideoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const RedditFeedRow = () => {
  const { videoGroups, isLoading } = useRedditFeedVideos();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-28 h-48 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (videoGroups.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-[9px]">r/</span>
          </div>
          <h3 className="font-semibold text-foreground">Reddit</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {videoGroups.length} {videoGroups.length === 1 ? "group" : "groups"}
          </span>
        </div>

        {videoGroups.length > 3 && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("left")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scroll("right")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto scrollbar-hide pb-1",
          "scroll-smooth snap-x snap-mandatory"
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {videoGroups.map((group) => (
          <div key={group.id} className="snap-start">
            <RedditVideoCard group={group} />
          </div>
        ))}
      </div>
    </div>
  );
};
