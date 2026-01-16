import { 
  Newspaper, 
  Users, 
  Calendar, 
  UsersRound, 
  Image, 
  Store,
  BadgeCheck,
  Bookmark,
  Settings
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMemberStats, formatCount } from "@/hooks/useMemberStats";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

const getNavItems = (t: TFunction) => [
  { icon: Newspaper, label: t("nav.feed"), path: "/", badge: null, iconColor: "text-blue-500" },
  { icon: Users, label: t("nav.friends"), path: "/friends", badge: null, iconColor: "text-green-500" },
  { icon: Calendar, label: t("nav.events"), path: "/events", badge: null, iconColor: "text-orange-500" },
  { icon: Bookmark, label: t("nav.saved", { defaultValue: "Saved" }), path: "/saved", badge: null, iconColor: "text-yellow-500" },
  { icon: UsersRound, label: t("nav.groups", { defaultValue: "Groups" }), path: "/groups", badge: null, iconColor: "text-purple-500" },
  { icon: Image, label: t("nav.photos"), path: "/photos", badge: null, iconColor: "text-pink-500" },
  { icon: Store, label: t("nav.marketplace"), path: "/marketplace", badge: null, iconColor: "text-cyan-500" },
  { icon: Settings, label: t("nav.settings", { defaultValue: "Settings" }), path: "/dashboard", badge: null, iconColor: "text-gray-500" },
];

// Demo group for sidebar
const yourGroups = [
  { name: "Tech Enthusiasts", avatar: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=50&h=50&fit=crop", memberCount: 1234 },
];

const pagesYouLike = [
  { name: "UI/UX Community", avatar: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=50&h=50&fit=crop", verified: false, color: "bg-orange-500" },
  { name: "Web Designer", avatar: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=50&h=50&fit=crop", verified: false, color: "bg-cyan-500" },
  { name: "Dribbble Community", avatar: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=50&h=50&fit=crop", verified: false, color: "bg-pink-500" },
  { name: "Behance", avatar: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=50&h=50&fit=crop", verified: true, color: "bg-blue-600" },
  { name: "Figma Community", avatar: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=50&h=50&fit=crop", verified: true, color: "bg-purple-500" },
  { name: "Adobe Creative", avatar: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=50&h=50&fit=crop", verified: true, color: "bg-red-500" },
];

// Demo profile for non-logged in users
const demoProfile = {
  display_name: "Jakob Botosh",
  username: "jakobbtsh",
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  is_verified: true,
};

export const LeftSidebar = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { data: memberStats } = useMemberStats();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.display_name || demoProfile.display_name;
  const username = profile?.username || user?.email?.split("@")[0] || demoProfile.username;
  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;
  const isVerified = profile?.is_verified ?? demoProfile.is_verified;

  // Use real stats for logged-in users, demo stats for guests
  const followers = user ? formatCount(memberStats?.followers || 0) : "2.3k";
  const following = user ? formatCount(memberStats?.following || 0) : "235";
  const posts = user ? formatCount(memberStats?.posts || 0) : "80";

  const navItems = getNavItems(t);

  return (
    <aside className="w-[280px] flex-shrink-0 hidden lg:block">
      <div className="fixed w-[280px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8 pr-2">
        {/* Profile Card */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground">
                {displayName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground truncate">
                  {displayName}
                </span>
                {isVerified && (
                  <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                @{username}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-center border-t border-border pt-3">
            <div className="flex-1">
              <div className="font-bold text-foreground">{followers}</div>
              <div className="text-xs text-muted-foreground">{t("friends.followers")}</div>
            </div>
            <div className="flex-1 border-x border-border">
              <div className="font-bold text-foreground">{following}</div>
              <div className="text-xs text-muted-foreground">{t("friends.following")}</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{posts}</div>
              <div className="text-xs text-muted-foreground">{t("sidebar.posts")}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-card rounded-xl p-2 mb-4 border border-border">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 mb-1 h-11 font-medium",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "" : item.iconColor)} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "text-xs font-medium min-w-[20px] h-5 flex items-center justify-center rounded-full",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Your Groups */}
        <div className="bg-card rounded-xl p-4 border border-border mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("sidebar.yourGroups")}
          </h3>
          <div className="space-y-2">
            {yourGroups.map((group, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                onClick={() => navigate("/groups")}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={group.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {group.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate block">{group.name}</span>
                  <span className="text-xs text-muted-foreground">{group.memberCount.toLocaleString()} members</span>
                </div>
              </div>
            ))}
            <Button 
              variant="link" 
              className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground"
              onClick={() => navigate("/groups")}
            >
              {t("sidebar.viewAll")}
            </Button>
          </div>
        </div>

        {/* Pages You Like */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("sidebar.pagesYouLike")}
          </h3>
          <div className="space-y-2">
            {pagesYouLike.map((page, index) => (
              <div key={index} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={page.avatar} />
                  <AvatarFallback className={cn(page.color, "text-white text-xs font-bold")}>
                    {page.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground flex items-center gap-1 truncate min-w-0">
                  <span className="truncate">{page.name}</span>
                  {page.verified && (
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </span>
              </div>
            ))}
            <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground">
              {t("sidebar.viewAll")}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 px-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <a href="#" className="hover:underline">{t("footer.privacyTerms")}</a>
            <a href="#" className="hover:underline">{t("footer.advertising")}</a>
            <a href="#" className="hover:underline">{t("footer.cookies")}</a>
          </div>
          <div className="mt-2">Platform © 2024</div>
        </div>
      </div>
    </aside>
  );
};
