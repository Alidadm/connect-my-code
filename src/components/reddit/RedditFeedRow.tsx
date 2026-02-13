import { useRedditFeedVideos } from "@/hooks/useRedditVideos";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { Skeleton } from "@/components/ui/skeleton";

export const RedditFeedRow = () => {
  const { videos, isLoading } = useRedditFeedVideos();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">r/</span>
        </div>
        <h3 className="font-semibold text-foreground">Reddit</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {videos.length} {videos.length === 1 ? "link" : "links"}
        </span>
      </div>

      {videos.map((video) => (
        <RedditPreviewCard key={video.id} url={video.reddit_url} />
      ))}
    </div>
  );
};
