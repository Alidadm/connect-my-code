import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

interface NewsItem {
  id: string;
  category_id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  image_url: string | null;
  published_at: string;
  expires_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
  };
}

interface NewsFlipbookProps {
  items: NewsItem[];
  categoryName?: string;
  categoryColor?: string;
}

export const NewsFlipbook: React.FC<NewsFlipbookProps> = ({
  items,
  categoryName,
  categoryColor,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useRef<number>(0);

  // Early return after all hooks
  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  const goToNext = () => {
    if (currentIndex < items.length - 1 && !isFlipping) {
      setFlipDirection("next");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0 && !isFlipping) {
      setFlipDirection("prev");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = handleTouchStart.current - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  const timeUntilExpiry = formatDistanceToNow(new Date(currentItem.expires_at), {
    addSuffix: true,
  });

  return (
    <div className="relative" ref={containerRef}>
      {/* Category header */}
      {categoryName && (
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            style={{ backgroundColor: categoryColor || undefined }}
            className="text-white font-medium"
          >
            {categoryName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      )}

      {/* Flipbook container */}
      <div
        className="relative bg-card rounded-xl shadow-lg overflow-hidden"
        onTouchStart={(e) => {
          handleTouchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        {/* News card with flip animation */}
        <div
          className={cn(
            "transition-all duration-300 transform-gpu",
            isFlipping && flipDirection === "next" && "animate-flip-out-right",
            isFlipping && flipDirection === "prev" && "animate-flip-out-left"
          )}
        >
          {/* Image */}
          {currentItem.image_url && (
            <div className="relative h-40 overflow-hidden">
              <img
                src={currentItem.image_url}
                alt={currentItem.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
              {currentItem.title}
            </h3>

            {currentItem.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {currentItem.summary}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("news.expires", "Expires")} {timeUntilExpiry}</span>
              </div>

              {currentItem.source_url && (
                <a
                  href={currentItem.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t("news.readMore", "Read more")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 backdrop-blur-sm rounded-full shadow-md",
            currentIndex === 0 && "opacity-30 cursor-not-allowed"
          )}
          onClick={goToPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 backdrop-blur-sm rounded-full shadow-md",
            currentIndex === items.length - 1 && "opacity-30 cursor-not-allowed"
          )}
          onClick={goToNext}
          disabled={currentIndex === items.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1 mt-3">
        {items.slice(0, 10).map((_, idx) => (
          <button
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              idx === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
            )}
            onClick={() => {
              if (!isFlipping) {
                setFlipDirection(idx > currentIndex ? "next" : "prev");
                setIsFlipping(true);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsFlipping(false);
                }, 300);
              }
            }}
          />
        ))}
        {items.length > 10 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{items.length - 10}
          </span>
        )}
      </div>
    </div>
  );
};
