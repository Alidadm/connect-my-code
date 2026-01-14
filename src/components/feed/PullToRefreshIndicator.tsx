import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const opacity = Math.min(pullDistance / 40, 1);
  const isReady = pullDistance >= threshold;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex justify-center items-center overflow-hidden transition-all duration-200 ease-out"
      style={{
        height: isRefreshing ? threshold : pullDistance,
        opacity: isRefreshing ? 1 : opacity,
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 transition-all",
          isReady && !isRefreshing && "bg-primary/20",
          isRefreshing && "bg-primary/15"
        )}
      >
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isReady && "text-primary"
            )}
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
