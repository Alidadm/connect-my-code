import { useFollow } from "@/hooks/useFollow";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FollowStatsProps {
  userId: string;
  className?: string;
  showLabels?: boolean;
}

export const FollowStats = ({
  userId,
  className,
  showLabels = true,
}: FollowStatsProps) => {
  const { t } = useTranslation();
  const { followersCount, followingCount } = useFollow(userId);

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{followersCount}</span>
        {showLabels && (
          <span className="text-muted-foreground">
            {t("follow.followers", "Followers")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{followingCount}</span>
        {showLabels && (
          <span className="text-muted-foreground">
            {t("follow.following", "Following")}
          </span>
        )}
      </div>
    </div>
  );
};
