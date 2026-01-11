import { 
  Newspaper, 
  Users, 
  Calendar, 
  Video, 
  Image, 
  Store, 
  FileText,
  BadgeCheck,
  Wallet,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: Newspaper, label: "Feed", path: "/", badge: null },
  { icon: Users, label: "Friends", path: "/friends", badge: null },
  { icon: Calendar, label: "Event", path: "/events", badge: 4 },
  { icon: Wallet, label: "Commissions", path: "/commissions", badge: null },
  { icon: Video, label: "Watch Videos", path: "/videos", badge: null },
  { icon: Image, label: "Photos", path: "/photos", badge: null },
  { icon: Store, label: "Marketplace", path: "/marketplace", badge: null },
  { icon: FileText, label: "Files", path: "/files", badge: 7 },
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
  followers: "2.3k",
  following: "235",
  posts: "80",
};

export const LeftSidebar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayProfile = profile || demoProfile;
  const displayName = profile?.display_name || demoProfile.display_name;
  const username = profile?.username || user?.email?.split("@")[0] || demoProfile.username;
  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;
  const isVerified = profile?.is_verified ?? demoProfile.is_verified;

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
              <div className="font-bold text-foreground">{demoProfile.followers}</div>
              <div className="text-xs text-muted-foreground">Follower</div>
            </div>
            <div className="flex-1 border-x border-border">
              <div className="font-bold text-foreground">{demoProfile.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{demoProfile.posts}</div>
              <div className="text-xs text-muted-foreground">Post</div>
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
                <item.icon className="h-5 w-5" />
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

        {/* Pages You Like */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pages You Like
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
              View All
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 px-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <a href="#" className="hover:underline">Privacy terms</a>
            <a href="#" className="hover:underline">Advertising</a>
            <a href="#" className="hover:underline">Cookies</a>
          </div>
          <div className="mt-2">Platform © 2024</div>
        </div>
      </div>
    </aside>
  );
};
