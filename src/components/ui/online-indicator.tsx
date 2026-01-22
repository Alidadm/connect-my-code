import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showOffline?: boolean;
  lastSeen?: string | null;
  showLastSeen?: boolean;
}

export const OnlineIndicator = ({
  isOnline,
  size = "md",
  className,
  showOffline = false,
  lastSeen,
  showLastSeen = false,
}: OnlineIndicatorProps) => {
  // Format last seen as relative time
  const formatLastSeen = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return null;
    }
  };

  // If showing last seen text (not the dot)
  if (showLastSeen && !isOnline && lastSeen) {
    const formattedTime = formatLastSeen(lastSeen);
    if (formattedTime) {
      return (
        <span className="text-xs text-muted-foreground">
          Last seen {formattedTime}
        </span>
      );
    }
    return null;
  }

  // Dot indicator
  if (!isOnline && !showOffline) return null;

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "absolute rounded-full ring-2 ring-background",
        sizeClasses[size],
        isOnline 
          ? "bg-emerald-500 animate-pulse" 
          : "bg-muted-foreground/50",
        className
      )}
      title={isOnline ? "Online" : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : "Offline"}
    />
  );
};

// Separate component for text-based last seen display
export const LastSeenText = ({
  isOnline,
  lastSeen,
}: {
  isOnline: boolean;
  lastSeen?: string | null;
}) => {
  if (isOnline) {
    return (
      <span className="text-xs text-emerald-500 font-medium">
        Online
      </span>
    );
  }

  if (!lastSeen) return null;

  try {
    const date = new Date(lastSeen);
    const formattedTime = formatDistanceToNow(date, { addSuffix: true });
    return (
      <span className="text-xs text-muted-foreground">
        Last seen {formattedTime}
      </span>
    );
  } catch {
    return null;
  }
};
