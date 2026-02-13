import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { RedditVideoGroup } from "@/hooks/useRedditVideos";
import { RedditPreviewCard } from "@/components/feed/RedditPreviewCard";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RedditVideoCardProps {
  group: RedditVideoGroup;
}

export const RedditVideoCard = ({ group }: RedditVideoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const videos = group.videos || [];
  if (videos.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex-shrink-0 relative w-28 h-48 rounded-xl overflow-hidden group",
          "bg-gradient-to-br from-orange-500 via-red-500 to-orange-700",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
      >
        {/* Thumbnail */}
        {videos[0]?.thumbnail_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${videos[0].thumbnail_url})` }}
          />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

        {/* Play / view icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-6 w-6 text-orange-600 fill-orange-600 ml-0.5" />
          </div>
        </div>

        {/* Count badge */}
        {videos.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
            {videos.length}
          </div>
        )}

        {/* Reddit branding */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[8px]">r/</span>
            </div>
            <span className="text-white text-xs font-medium truncate">
              {group.title || "Reddit"}
            </span>
          </div>
        </div>
      </button>

      {/* Lightbox / dialog showing all Reddit links */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">r/</span>
              </div>
              {group.title || "Reddit Links"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-4">
              {videos.map((video) => (
                <RedditPreviewCard key={video.id} url={video.reddit_url} />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
