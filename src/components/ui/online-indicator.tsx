import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showOffline?: boolean;
}

export const OnlineIndicator = ({
  isOnline,
  size = "md",
  className,
  showOffline = false,
}: OnlineIndicatorProps) => {
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
      title={isOnline ? "Online" : "Offline"}
    />
  );
};
