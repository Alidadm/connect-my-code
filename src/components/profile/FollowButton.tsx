import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export const FollowButton = ({
  userId,
  className,
  variant = "default",
  size = "default",
  showIcon = true,
}: FollowButtonProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFollowing, loading, toggleFollow } = useFollow(userId);

  // Don't show button for own profile or if not logged in
  if (!user || user.id === userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={toggleFollow}
      disabled={loading}
      className={cn(
        "gap-2 transition-all",
        isFollowing && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        isFollowing ? (
          <UserMinus className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )
      ) : null}
      {isFollowing
        ? t("follow.following", "Following")
        : t("follow.follow", "Follow")}
    </Button>
  );
};
