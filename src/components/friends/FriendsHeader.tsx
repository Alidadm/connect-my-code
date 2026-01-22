import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { BadgeCheck, Settings, MapPin, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FriendsHeaderProps {
  friendsCount: number;
  pendingCount: number;
  sentCount: number;
}

const demoProfile = {
  display_name: "Dolphy Member",
  username: "member",
  avatar_url: "",
  cover_url:
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop",
  is_verified: true,
  location: "Los Angeles, CA",
};

export const FriendsHeader = ({ friendsCount, pendingCount, sentCount }: FriendsHeaderProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    demoProfile.display_name;

  const username =
    profile?.username || user?.email?.split("@")[0] || demoProfile.username;

  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;
  const coverUrl = profile?.cover_url || demoProfile.cover_url;
  const isVerified = profile?.is_verified ?? demoProfile.is_verified;
  const location = profile?.location || demoProfile.location;

  // Handle sticky on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      
      const headerRect = headerRef.current.getBoundingClientRect();
      const siteHeaderHeight = 64;
      const shouldBeSticky = headerRect.bottom <= siteHeaderHeight;
      
      if (shouldBeSticky !== isSticky) {
        setIsSticky(shouldBeSticky);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSticky]);

  return (
    <section
      ref={headerRef}
      aria-label="Friends header"
      className="mb-4 overflow-visible rounded-xl bg-card shadow-sm relative"
    >
      {/* Cover Image Section */}
      <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-primary/30 to-primary/10">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${displayName}'s cover photo`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}

        {/* Settings button on cover */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground shadow-lg hover:bg-muted/80 transition-colors"
            title={t("profile.settings", "Settings")}
            onClick={() => navigate("/dashboard")}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="relative bg-card border-t border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 pb-4">
          {/* Avatar - overlapping the cover */}
          <div className="relative -mt-16 ml-4 sm:ml-6 flex-shrink-0">
            <div 
              className={`group relative ${user ? "cursor-pointer" : ""}`}
              onClick={() => user && navigate("/dashboard")}
              title={user ? t("profile.changeAvatar", "Change avatar") : undefined}
            >
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-card shadow-xl border-2 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} alt={`${displayName}'s avatar`} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-2xl" showCameraIcon />
              </Avatar>
              {user && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Name and Location */}
          <div className="flex-1 min-w-0 px-4 sm:px-0 pt-2 sm:pt-4 sm:pb-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link 
                  to={user && username ? `/${username}` : "#"}
                  className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent hover:from-accent hover:to-primary transition-all duration-300 truncate"
                >
                  {displayName}
                </Link>
                {isVerified && (
                  <BadgeCheck
                    className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0"
                    aria-label="Verified"
                  />
                )}
              </div>
              {location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary/70" />
                  <span className="font-medium">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <div className="text-center">
            <p className="text-lg sm:text-xl font-bold text-foreground">{friendsCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("friends.friends", "Friends")}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg sm:text-xl font-bold text-foreground">{pendingCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("friends.pending", "Pending")}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg sm:text-xl font-bold text-foreground">{sentCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("friends.sent", "Sent")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
