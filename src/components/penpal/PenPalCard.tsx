import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Loader2, 
  UserPlus, 
  MessageCircle, 
  BadgeCheck,
  Sparkles
} from "lucide-react";
import { type PenPalProfile } from "@/hooks/usePenPals";

interface PenPalCardProps {
  profile: PenPalProfile;
  onConnect: (userId: string) => Promise<boolean>;
  connecting: boolean;
  isConnected?: boolean;
}

export const PenPalCard = ({ 
  profile, 
  onConnect, 
  connecting,
  isConnected = false 
}: PenPalCardProps) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const getDisplayName = () => {
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    return profile.username || "Anonymous";
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

  const getLocation = () => {
    if (profile.country && profile.location) {
      return `${profile.location}, ${profile.country}`;
    }
    return profile.country || profile.location || null;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Avatar */}
          <Link to={`/${profile.username || profile.user_id}`}>
            <Avatar className="h-20 w-20 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
              {!imageError && profile.avatar_url ? (
                <AvatarImage 
                  src={profile.avatar_url} 
                  alt={getDisplayName()}
                  onError={() => setImageError(true)}
                />
              ) : null}
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Name & Verification */}
          <div className="space-y-1">
            <Link 
              to={`/${profile.username || profile.user_id}`}
              className="flex items-center justify-center gap-1 hover:underline"
            >
              <span className="font-semibold text-foreground">{getDisplayName()}</span>
              {profile.is_verified && (
                <BadgeCheck className="h-4 w-4 text-primary" />
              )}
            </Link>
            {profile.username && (
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          {/* Location */}
          {getLocation() && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{getLocation()}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center max-w-full">
              {profile.interests.slice(0, 3).map((interest) => (
                <Badge 
                  key={interest} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0"
                >
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 3 && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0"
                >
                  +{profile.interests.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="w-full pt-2">
            {isConnected ? (
              <Link to={`/${profile.username || profile.user_id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {t("penpal.viewProfile", "View Profile")}
                </Button>
              </Link>
            ) : (
              <Button 
                size="sm" 
                className="w-full gap-2"
                onClick={() => onConnect(profile.user_id)}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("penpal.connect", "Connect")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
