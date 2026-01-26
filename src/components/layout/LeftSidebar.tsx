import { useState, useEffect } from "react";
import { 
  Newspaper, 
  Users, 
  UsersRound, 
  Image, 
  Store,
  BadgeCheck,
  Bookmark,
  Crown,
  Plus,
  Loader2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Gamepad2,
  Play,
  Clock,
  Trash2,
  CalendarDays
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMemberStats, useUserGroups, formatCount } from "@/hooks/useMemberStats";
import { useUserBusiness } from "@/hooks/useBusiness";
import { useGameNotifications } from "@/hooks/useGameNotifications";
import { useSavedGames } from "@/hooks/useSavedGames";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FavoritesSection } from "./FavoritesSection";
import type { TFunction } from "i18next";

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getNavItems = (t: TFunction, gameBadge: number | null) => [
  { icon: Newspaper, label: t("nav.feed"), path: "/", badge: null, iconColor: "text-blue-500" },
  { icon: Users, label: t("nav.friends"), path: "/friends", badge: null, iconColor: "text-green-500" },
  { icon: CalendarDays, label: t("nav.events", { defaultValue: "Events" }), path: "/events", badge: null, iconColor: "text-orange-500" },
  { icon: Gamepad2, label: t("nav.games", { defaultValue: "Games" }), path: "/games", badge: gameBadge, iconColor: "text-red-500" },
  { icon: Bookmark, label: t("nav.saved", { defaultValue: "Saved" }), path: "/saved", badge: null, iconColor: "text-yellow-500" },
  { icon: UsersRound, label: t("nav.groups", { defaultValue: "Groups" }), path: "/groups", badge: null, iconColor: "text-purple-500" },
  { icon: Image, label: t("nav.photos"), path: "/photos", badge: null, iconColor: "text-pink-500" },
  { icon: Store, label: t("nav.marketplace"), path: "/marketplace", badge: null, iconColor: "text-cyan-500" },
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
  const { data: userGroups } = useUserGroups();
  const { data: userBusiness } = useUserBusiness();
  const { pendingTurnCount } = useGameNotifications();
  const { savedSudokuGames, deleteSavedGame } = useSavedGames();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigatingToCreate, setIsNavigatingToCreate] = useState(false);

  // Reset loading state when location changes (user navigated or modal closed)
  useEffect(() => {
    setIsNavigatingToCreate(false);
  }, [location.pathname, location.search]);

  const handleCreateGroup = () => {
    setIsNavigatingToCreate(true);
    navigate("/groups?create=true");
  };

  const displayName = profile?.display_name || demoProfile.display_name;
  const username = profile?.username || user?.email?.split("@")[0] || demoProfile.username;
  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;
  const isVerified = profile?.is_verified ?? demoProfile.is_verified;

  // Use real stats for logged-in users, demo stats for guests
  const followers = user ? formatCount(memberStats?.followers || 0) : "2.3k";
  const following = user ? formatCount(memberStats?.following || 0) : "235";
  const posts = user ? formatCount(memberStats?.posts || 0) : "80";

  const gameBadge = pendingTurnCount > 0 ? pendingTurnCount : null;
  const navItems = getNavItems(t, gameBadge);

  return (
    <aside className="w-[280px] flex-shrink-0 hidden lg:block">
      <div className="fixed w-[280px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8 pr-2">
        {/* Profile Card */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border sidebar-widget-border">
          <div 
            className={cn(
              "flex items-center gap-3 mb-4",
              user && "cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
            )}
            onClick={() => user && navigate(`/${username}`)}
          >
            <Avatar className="h-12 w-12">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : null}
              <AvatarFallback 
                showCameraIcon={user && !profile?.avatar_url}
                className="bg-muted"
              >
                {!user && <AvatarImage src={demoProfile.avatar_url} />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className={cn(
                  "font-semibold text-foreground truncate",
                  user && "hover:underline"
                )}>
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
          
          {/* Stats */}
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
        <nav className="bg-card rounded-xl p-2 mb-4 border border-border sidebar-widget-border">
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

        {/* Favorites Section */}
        <div className="mb-4">
          <FavoritesSection />
        </div>

        {/* Continue Playing - Show saved games */}
        {user && savedSudokuGames.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border mb-4 sidebar-widget-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Play className="h-3.5 w-3.5" />
              {t("sidebar.continuePlaying", { defaultValue: "Continue Playing" })}
            </h3>
            <hr className="border-border my-3" />
            <div className="space-y-2">
              {savedSudokuGames.slice(0, 3).map((game) => (
                <div
                  key={game.id}
                  className="group flex items-center gap-3 hover:bg-secondary/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/games?sudoku=${game.id}`)}
                  >
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Gamepad2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{t("games.sudoku.title", { defaultValue: "Sudoku" })}</span>
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full capitalize">
                          {t(`games.difficulty.${game.difficulty}`, { defaultValue: game.difficulty })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(game.player_1_time || 0)}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-primary group-hover:hidden">
                      {t("sidebar.continue", { defaultValue: "Continue" })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hidden group-hover:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(t("games.confirmDeleteGame", { defaultValue: "Are you sure you want to delete this saved game?" }))) {
                        deleteSavedGame(game.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Card - Show only if user has enabled business */}
        {user && userBusiness?.is_enabled && (
          <div 
            className="bg-card rounded-xl overflow-hidden border border-border mb-4 cursor-pointer hover:border-primary/50 transition-colors sidebar-widget-border"
            onClick={() => navigate(`/business/${userBusiness.id}`)}
          >
            {/* Cover */}
            <div className={cn(
              "h-16 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative",
              userBusiness.cover_url && "bg-none"
            )}>
              {userBusiness.cover_url && (
                <img
                  src={userBusiness.cover_url}
                  alt="Business cover"
                  className="w-full h-full object-cover"
                />
              )}
              {/* Business Icon overlay */}
              <div className="absolute -bottom-4 left-3">
                <div className="h-10 w-10 rounded-lg bg-card border-2 border-background shadow flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            {/* Business Info */}
            <div className="pt-6 pb-3 px-3">
              <h4 className="font-semibold text-sm text-foreground truncate">
                {userBusiness.name}
              </h4>
              {userBusiness.category && (
                <span className="text-xs text-muted-foreground">
                  {userBusiness.category.name}
                </span>
              )}
              
              {/* Contact Info */}
              <div className="mt-2 space-y-1">
                {userBusiness.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="truncate">{userBusiness.phone}</span>
                  </div>
                )}
                {userBusiness.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{userBusiness.email}</span>
                  </div>
                )}
                {userBusiness.website_url && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{userBusiness.website_url.replace(/^https?:\/\//, '')}</span>
                  </div>
                )}
                {userBusiness.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{userBusiness.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Your Groups - Show groups or create button */}
        {user && (
          <div className="bg-card rounded-xl p-4 border border-border mb-4 sidebar-widget-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("sidebar.yourGroups")}
            </h3>
            <hr className="border-border my-3" />
            {userGroups?.createdGroups && userGroups.createdGroups.length > 0 ? (
              <div className="space-y-2">
                {userGroups.createdGroups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={group.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {group.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                        <Crown className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{group.name}</span>
                        <span className="text-[10px] font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {t("sidebar.owner", { defaultValue: "Owner" })}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.membersCount", { count: group.member_count || 0, defaultValue: "{{count}} members" })}
                      </span>
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
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("sidebar.noGroupsYet", { defaultValue: "You haven't created any groups yet" })}
                </p>
                <Button 
                  size="sm" 
                  className="w-full gap-2"
                  disabled={isNavigatingToCreate}
                  onClick={handleCreateGroup}
                >
                  {isNavigatingToCreate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("sidebar.createGroup", { defaultValue: "Create Group" })}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Groups You Like - Only show if user has joined groups */}
        {user && userGroups?.joinedGroups && userGroups.joinedGroups.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border sidebar-widget-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("sidebar.groupsYouLike", { defaultValue: "Groups You Like" })}
            </h3>
            <hr className="border-border my-3" />
            <div className="space-y-2">
              {userGroups.joinedGroups.map((group) => (
                <div 
                  key={group.id} 
                  className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={group.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-500 text-white text-xs font-bold">
                      {group.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground truncate block">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("sidebar.membersCount", { count: group.member_count || 0, defaultValue: "{{count}} members" })}
                    </span>
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
        )}

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
