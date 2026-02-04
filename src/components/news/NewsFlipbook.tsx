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

const ITEMS_PER_PAGE = 3;
const MAX_PAGES = 10;

export const NewsFlipbook: React.FC<NewsFlipbookProps> = ({
  items,
  categoryName,
  categoryColor,
}) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useRef<number>(0);

  // Early return after all hooks
  if (items.length === 0) {
    return null;
  }

  // Calculate pages - limit to MAX_PAGES
  const totalPages = Math.min(Math.ceil(items.length / ITEMS_PER_PAGE), MAX_PAGES);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToNext = () => {
    if (currentPage < totalPages - 1 && !isFlipping) {
      setFlipDirection("next");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const goToPrev = () => {
    if (currentPage > 0 && !isFlipping) {
      setFlipDirection("prev");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1);
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
            {t("news.page", "Page")} {currentPage + 1} / {totalPages}
          </span>
        </div>
      )}

      {/* Flipbook container */}
      <div
        className="relative bg-card rounded-xl overflow-hidden"
        onTouchStart={(e) => {
          handleTouchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        {/* News list with flip animation */}
        <div
          className={cn(
            "transition-all duration-300 transform-gpu",
            isFlipping && flipDirection === "next" && "animate-flip-out-right",
            isFlipping && flipDirection === "prev" && "animate-flip-out-left"
          )}
        >
          <div className="divide-y divide-border/50">
            {pageItems.map((item) => (
              <NewsRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 px-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-full",
              currentPage === 0 && "opacity-30 cursor-not-allowed"
            )}
            onClick={goToPrev}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Dots indicator */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  idx === currentPage ? "bg-primary" : "bg-muted-foreground/30"
                )}
                onClick={() => {
                  if (!isFlipping) {
                    setFlipDirection(idx > currentPage ? "next" : "prev");
                    setIsFlipping(true);
                    setTimeout(() => {
                      setCurrentPage(idx);
                      setIsFlipping(false);
                    }, 300);
                  }
                }}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-full",
              currentPage === totalPages - 1 && "opacity-30 cursor-not-allowed"
            )}
            onClick={goToNext}
            disabled={currentPage === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Compact news row component (no image)
const NewsRow: React.FC<{ item: NewsItem }> = ({ item }) => {
  const { t } = useTranslation();
  
  const timeAgo = formatDistanceToNow(new Date(item.published_at), {
    addSuffix: true,
  });

  return (
    <div className="py-2.5 px-1">
      {item.source_url ? (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </a>
      ) : (
        <div>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
            {item.title}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
      )}
    </div>
  );
};
