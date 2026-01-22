import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, UserPlus, Users } from "lucide-react";

interface ProfileData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio?: string | null;
  location?: string | null;
}

interface ProfileHoverCardProps {
  children: ReactNode;
  profile: ProfileData;
  mutualFriendsCount?: number;
  onAddFriend?: () => void;
  isAddingFriend?: boolean;
  showAddButton?: boolean;
}

export const ProfileHoverCard = ({
  children,
  profile,
  mutualFriendsCount = 0,
  onAddFriend,
  isAddingFriend = false,
  showAddButton = true,
}: ProfileHoverCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getDisplayName = () => {
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name || "Unknown User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileClick = () => {
    if (profile.username) {
      navigate(`/${profile.username}`);
    }
  };

  // Default cover gradient if no cover image
  const defaultCover = "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 100%)";

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden" 
        side="top" 
        align="center"
        sideOffset={8}
      >
        {/* Cover Photo */}
        <div 
          className="h-24 w-full bg-cover bg-center"
          style={{
            backgroundImage: profile.cover_url 
              ? `url(${profile.cover_url})` 
              : defaultCover,
          }}
        />

        {/* Profile Content */}
        <div className="px-4 pb-4">
          {/* Avatar - overlapping cover */}
          <div className="-mt-10 mb-2">
            <Avatar 
              className="h-16 w-16 ring-4 ring-background cursor-pointer hover:ring-primary transition-all"
              onClick={handleProfileClick}
            >
              <AvatarImage 
                src={profile.avatar_url || undefined} 
                className="object-cover"
              />
              <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name & Username */}
          <div className="space-y-0.5">
            <h4 
              className="font-semibold text-base cursor-pointer hover:underline"
              onClick={handleProfileClick}
            >
              {getDisplayName()}
            </h4>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Mutual Friends */}
          {mutualFriendsCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <Users className="h-3.5 w-3.5" />
              <span>
                {mutualFriendsCount} {t("friends.mutualFriends", { defaultValue: "mutual friends" })}
              </span>
            </div>
          )}

          {/* Add Friend Button */}
          {showAddButton && onAddFriend && (
            <Button
              size="sm"
              onClick={onAddFriend}
              disabled={isAddingFriend}
              className="w-full mt-3 gap-1"
            >
              <UserPlus className="h-4 w-4" />
              {t("friends.addFriend", { defaultValue: "Add Friend" })}
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
