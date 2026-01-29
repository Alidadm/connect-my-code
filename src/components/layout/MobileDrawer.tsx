import { 
  Newspaper, 
  Users, 
  UsersRound, 
  Image, 
  Store,
  Bookmark,
  Gamepad2,
  User,
  Settings,
  Lock,
  HelpCircle,
  MessageSquarePlus,
  LogOut,
  LayoutDashboard,
  Shield,
  Info
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useGameNotifications } from "@/hooks/useGameNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useState, useEffect } from "react";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const demoProfile = {
  display_name: "Jakob Botosh",
  username: "jakobbtsh",
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const MobileDrawer = ({ open, onOpenChange }: MobileDrawerProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { pendingTurnCount } = useGameNotifications();
  const [isAdmin, setIsAdmin] = useState(false);

  const gameBadge = pendingTurnCount > 0 ? pendingTurnCount : null;

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase.rpc("has_role", {
        _role: "admin",
        _user_id: user.id,
      });
      
      if (!error && data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminRole();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    navigate("/login");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || demoProfile.display_name;
  const username = profile?.username || user?.email?.split("@")[0] || demoProfile.username;
  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;

  const navItems = [
    { icon: Newspaper, label: t("nav.feed"), path: "/", badge: null, iconColor: "text-blue-500" },
    { icon: Users, label: t("nav.friends"), path: "/friends", badge: null, iconColor: "text-green-500" },
    { icon: Gamepad2, label: t("nav.games", { defaultValue: "Games" }), path: "/games", badge: gameBadge, iconColor: "text-red-500" },
    { icon: Bookmark, label: t("nav.saved", { defaultValue: "Saved" }), path: "/saved", badge: null, iconColor: "text-yellow-500" },
    { icon: UsersRound, label: t("nav.groups", { defaultValue: "Groups" }), path: "/groups", badge: null, iconColor: "text-purple-500" },
    { icon: Image, label: t("nav.photos"), path: "/__PHOTOS__", badge: null, iconColor: "text-pink-500" },
    { icon: Store, label: t("nav.marketplace"), path: "/marketplace", badge: null, iconColor: "text-cyan-500" },
    { icon: Info, label: t("nav.about", { defaultValue: "About" }), path: "/about", badge: null, iconColor: "text-slate-500" },
  ];

  const settingsItems = user ? [
    { icon: LayoutDashboard, label: t('header.dashboard', { defaultValue: 'Dashboard' }), path: "/dashboard" },
    { icon: Settings, label: t('header.settings'), path: "/settings" },
    { icon: Lock, label: t('header.privacy', { defaultValue: 'Privacy Settings' }), path: "/privacy" },
    { icon: HelpCircle, label: t('header.helpSupport', { defaultValue: 'Help & Support' }), path: "/help" },
    { icon: MessageSquarePlus, label: t('header.giveFeedback', { defaultValue: 'Give Feedback' }), path: "/feedback" },
  ] : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[280px] fixed right-0 left-auto rounded-none rounded-l-xl">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle className="sr-only">Navigation Menu</DrawerTitle>
          {/* Profile Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => handleNavigate(user ? `/${username}` : "/login")}
          >
            <Avatar className="h-12 w-12">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : (
                <AvatarImage src={demoProfile.avatar_url} />
              )}
              <AvatarFallback className="bg-muted">
                {displayName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Admin Link */}
          {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 mb-2 h-11 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
              onClick={() => handleNavigate("/adminindex")}
            >
              <Shield className="h-5 w-5" />
              <span>Admin Dashboard</span>
            </Button>
          )}

          {/* Main Navigation */}
          <nav className="space-y-1 mb-6">
            {navItems.map((item) => {
              const isPhotosItem = item.path === "/__PHOTOS__";
              const isActive = isPhotosItem 
                ? location.pathname === `/${username}` && location.search.includes('tab=photos')
                : location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 font-medium",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  onClick={() => handleNavigate(isPhotosItem ? `/${username}?tab=photos` : item.path)}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "" : item.iconColor)} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 min-w-[20px] px-1.5"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>

          {/* Settings Section */}
          {user && settingsItems.length > 0 && (
            <>
              <div className="border-t border-border pt-4 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {t('header.settings')}
                </p>
              </div>
              <nav className="space-y-1 mb-6">
                {settingsItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-10 font-medium",
                        isActive && "bg-secondary"
                      )}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </>
          )}

          {/* Auth Actions */}
          <div className="border-t border-border pt-4">
            {user ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>{t('header.logOut')}</span>
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleNavigate("/signup")}
                >
                  {t('common.signUp')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleNavigate("/login")}
                >
                  {t('common.logIn')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
