import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { BadgeCheck } from "lucide-react";

const demoProfile = {
  display_name: "Dolphy Member",
  username: "member",
  avatar_url:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
  cover_url:
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop",
  is_verified: true,
};

export const MemberCoverHeader = () => {
  const { user, profile } = useAuth();

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

  return (
    <section
      aria-label="Profile header"
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative h-28 sm:h-32 bg-gradient-to-br from-primary/30 to-primary/10">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${displayName}'s cover photo`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>

      <div className="relative px-4 pb-4">
        <div className="absolute -top-10 left-4">
          <div 
            className="rounded-full p-1"
            style={{
              backgroundImage: 'linear-gradient(to top left, #ff3cac, #562b7c, #2b86c5)'
            }}
          >
            <Avatar className="h-20 w-20 ring-2 ring-card">
              <AvatarImage src={avatarUrl || undefined} alt={`${displayName}'s avatar`} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {(displayName?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="pt-12 sm:pt-14">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {displayName}
            </h2>
            {isVerified && (
              <BadgeCheck
                className="h-4 w-4 text-primary flex-shrink-0"
                aria-label="Verified"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">@{username}</p>
        </div>
      </div>
    </section>
  );
};
