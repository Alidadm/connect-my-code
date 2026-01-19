import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { BadgeCheck, UserPlus, Star, MessageCircle, Settings, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ProfileAboutSection } from "./ProfileAboutSection";

interface MemberCoverHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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

export const MemberCoverHeader = ({ activeTab: externalActiveTab, onTabChange }: MemberCoverHeaderProps = {}) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState("feed");
  const [stats, setStats] = useState<ProfileStats>({ friendsCount: 0, postsCount: 0, blogsCount: 0 });
  const [aboutOpen, setAboutOpen] = useState(false);

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

  const tabs = [
    { id: "feed", label: t("profile.feed", "Feed") },
    { id: "about", label: t("profile.about", "About"), isToggle: true },
    { id: "photos", label: t("profile.photos", "Photos") },
    { id: "videos", label: t("profile.videos", "Videos") },
    { id: "friends", label: t("profile.friends", "Friends"), count: stats.friendsCount },
    { id: "posts", label: t("profile.posts", "Posts"), count: stats.postsCount },
    { id: "blogs", label: t("profile.blogs", "Blogs"), count: stats.blogsCount, disabled: stats.blogsCount === 0 },
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

        {/* Action buttons on the cover - bottom right */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fa6342] text-white shadow-lg hover:bg-[#e55535] transition-colors"
            title={t("profile.addFriend", "Add Friend")}
          >
            <UserPlus className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7c5ac2] text-white shadow-lg hover:bg-[#6a4aad] transition-colors"
            title={t("profile.favorite", "Favorite")}
          >
            <Star className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#38b8ff] text-white shadow-lg hover:bg-[#2aa3e9] transition-colors"
            title={t("profile.message", "Message")}
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7280] text-white shadow-lg hover:bg-[#5b6370] transition-colors"
            title={t("profile.settings", "Settings")}
            onClick={() => navigate("/dashboard")}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="relative bg-card border-t border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-end">
          {/* Avatar - overlapping the cover */}
          <div className="relative -mt-12 ml-4 sm:ml-6 flex-shrink-0">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-card shadow-lg">
              <AvatarImage src={avatarUrl || undefined} alt={`${displayName}'s avatar`} />
              <AvatarFallback className="bg-muted" showCameraIcon />
            </Avatar>
          </div>

          {/* Name and Location */}
          <div className="flex-1 min-w-0 px-4 py-3 sm:pb-0 sm:pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <Link 
                    to={user && username ? `/${username}` : "#"}
                    className="text-lg sm:text-xl font-semibold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {displayName}
                  </Link>
                  {isVerified && (
                    <BadgeCheck
                      className="h-5 w-5 text-primary flex-shrink-0"
                      aria-label="Verified"
                    />
                  )}
                </div>
                {location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-border mt-2">
          <nav className="flex items-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center px-4 sm:px-6">
              {/* Spacer for avatar alignment */}
              <div className="w-24 sm:w-28 flex-shrink-0" />
              
              {/* Tabs */}
              <ul className="flex items-center gap-1 sm:gap-2 py-1">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabClick(tab.id)}
                      disabled={tab.disabled}
                      className={`relative px-3 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        tab.disabled
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : tab.id === "about" && aboutOpen
                            ? "text-primary"
                            : activeTab === tab.id && tab.id !== "about"
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {tab.label}
                        {tab.id === "about" && (
                          aboutOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        )}
                        {tab.count !== undefined && (
                          <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded ${
                            tab.disabled ? "bg-muted/50" : "bg-muted"
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </span>
                      {tab.id === "about" && aboutOpen && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary" />
                      )}
                      {activeTab === tab.id && !tab.disabled && tab.id !== "about" && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

      </div>

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
