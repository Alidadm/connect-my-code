import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { BadgeCheck, UserPlus, Star, MessageCircle, Settings, MapPin, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ProfileAboutSection } from "./ProfileAboutSection";
import { cn } from "@/lib/utils";

interface MemberCoverHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onStickyChange?: (isSticky: boolean) => void;
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

interface ProfileStats {
  friendsCount: number;
  postsCount: number;
  blogsCount: number;
}

export const MemberCoverHeader = ({ activeTab: externalActiveTab, onTabChange, onStickyChange }: MemberCoverHeaderProps = {}) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState("feed");
  const [stats, setStats] = useState<ProfileStats>({ friendsCount: 0, postsCount: 0, blogsCount: 0 });
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Use external tab if provided, otherwise use internal state
  const activeTab = externalActiveTab ?? internalActiveTab;

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

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      // Fetch friends count
      const { count: friendsAsRequester } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("requester_id", user.id)
        .eq("status", "accepted");

      const { count: friendsAsAddressee } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "accepted");

      // Fetch posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch blogs count
      const { count: blogsCount } = await supabase
        .from("blogs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published");

      setStats({
        friendsCount: (friendsAsRequester || 0) + (friendsAsAddressee || 0),
        postsCount: postsCount || 0,
        blogsCount: blogsCount || 0,
      });
    };

    fetchStats();
  }, [user]);

  // Handle sticky tabs on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current || !headerRef.current) return;
      
      const headerRect = headerRef.current.getBoundingClientRect();
      const tabsRect = tabsRef.current.getBoundingClientRect();
      
      // Get the header height (accounting for the main site header ~64px)
      const siteHeaderHeight = 64;
      const shouldBeSticky = headerRect.bottom <= siteHeaderHeight;
      
      if (shouldBeSticky !== isSticky) {
        setIsSticky(shouldBeSticky);
        onStickyChange?.(shouldBeSticky);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSticky, onStickyChange]);

  const tabs = [
    { id: "feed", label: t("profile.feed", { defaultValue: "Feed" }) },
    { id: "about", label: t("profile.about", { defaultValue: "About" }), isToggle: true },
    { id: "photos", label: t("profile.photos", { defaultValue: "Photos" }) },
    { id: "videos", label: t("profile.videos", { defaultValue: "Videos" }) },
    { id: "friends", label: t("profile.friends", { defaultValue: "Friends" }), count: stats.friendsCount },
    { id: "posts", label: t("profile.posts", { defaultValue: "Posts" }), count: stats.postsCount },
    { id: "blogs", label: t("profile.blogs", { defaultValue: "Blogs" }), count: stats.blogsCount, disabled: stats.blogsCount === 0 },
  ];

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.disabled) return;
    
    // Special handling for About - toggle slide instead of switching tabs
    if (tabId === "about") {
      setAboutOpen(!aboutOpen);
      return;
    }
    
    // Close About section when switching to other tabs
    setAboutOpen(false);
    
    // If external control is provided, use it
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
    // Note: We no longer navigate away - content changes in-place
  };

  return (
    <section
      ref={headerRef}
      aria-label="Profile header"
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

        {/* Action button on the cover - Settings only (Add Friend, Favorite, Message are for other users' profiles) */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground shadow-lg hover:bg-muted/80 transition-colors"
            title={t("profile.settings", { defaultValue: "Settings" })}
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
                title={user ? t("profile.changeAvatar", { defaultValue: "Change avatar" }) : undefined}
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

      {/* Navigation Tabs - Sticky when scrolling */}
      <div 
        ref={tabsRef}
        className={cn(
          "border-t border-border transition-all duration-300",
          isSticky && "fixed top-[64px] left-0 right-0 z-50 bg-card/95 backdrop-blur-md shadow-md border-b animate-fade-in"
        )}
      >
        <nav className={cn(
          "flex overflow-x-auto scrollbar-hide w-full",
          isSticky ? "max-w-3xl mx-auto px-4" : "justify-start sm:justify-center"
        )}>
          {/* Tabs */}
          <ul className="flex items-center gap-0.5 sm:gap-2 py-2 px-2 sm:px-4 w-full justify-center">
            {tabs.map((tab) => (
              <li key={tab.id} className="flex-shrink-0">
                <button
                  onClick={() => handleTabClick(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "relative px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    tab.disabled && "text-muted-foreground/50 cursor-not-allowed",
                    !tab.disabled && tab.id === "about" && aboutOpen && "text-primary",
                    !tab.disabled && activeTab === tab.id && tab.id !== "about" && "text-primary",
                    !tab.disabled && !(tab.id === "about" && aboutOpen) && !(activeTab === tab.id && tab.id !== "about") && "text-muted-foreground hover:text-primary"
                  )}
                >
                  <span className="flex items-center gap-1">
                    {tab.label}
                    {tab.id === "about" && (
                      aboutOpen ? (
                        <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      )
                    )}
                    {tab.count !== undefined && (
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs font-semibold rounded-full",
                        tab.disabled ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {tab.id === "about" && aboutOpen && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-primary rounded-full" />
                  )}
                  {activeTab === tab.id && !tab.disabled && tab.id !== "about" && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Spacer when tabs are sticky to prevent content jump */}
      {isSticky && <div className="h-12" />}


      {/* About Section - Slide Down Overlay (overlaps content below) */}
      <div
        className={`absolute left-0 right-0 transition-all duration-300 ease-in-out overflow-hidden ${
          aboutOpen 
            ? "max-h-[2000px] opacity-100 pointer-events-auto" 
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
        style={{
          top: "100%",
          zIndex: 50,
        }}
      >
        <div className="bg-card border border-border rounded-b-xl shadow-xl">
          <ProfileAboutSection userId={user?.id} />
        </div>
      </div>
    </section>
  );
};
