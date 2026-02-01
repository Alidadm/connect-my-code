import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TikTokVideo } from "@/hooks/useTikTokVideos";
import { getTikTokEmbedUrl } from "@/lib/tiktok";
import { cn } from "@/lib/utils";

interface TikTokVideoLightboxProps {
  videos: TikTokVideo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const TikTokVideoLightbox = ({
  videos,
  initialIndex,
  isOpen,
  onClose,
}: TikTokVideoLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, currentIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
  }, [videos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
  }, [videos.length]);

  if (!isOpen || videos.length === 0) return null;

  const currentVideo = videos[currentIndex];
  const embedUrl = getTikTokEmbedUrl(currentVideo.tiktok_url);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 h-10 w-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Video counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
        {currentIndex + 1} / {videos.length}
      </div>

      {/* Previous button */}
      {videos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Video container */}
      <div 
        className="relative w-full max-w-[400px] h-[80vh] max-h-[700px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          key={currentVideo.id}
          src={embedUrl}
          className="w-full h-full rounded-xl"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        
        {/* Video title if available */}
        {currentVideo.video_title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl">
            <p className="text-white text-sm line-clamp-2">{currentVideo.video_title}</p>
            {currentVideo.author_name && (
              <p className="text-white/70 text-xs mt-1">@{currentVideo.author_name}</p>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      {videos.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Dot indicators */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {videos.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/40 hover:bg-white/60"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
