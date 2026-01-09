import { 
  Newspaper, 
  Users, 
  Calendar, 
  Video, 
  Image, 
  Store, 
  FileText,
  BadgeCheck
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
  { icon: Video, label: "Watch Videos", path: "/videos", badge: null },
  { icon: Image, label: "Photos", path: "/photos", badge: null },
  { icon: Store, label: "Marketplace", path: "/marketplace", badge: null },
  { icon: FileText, label: "Files", path: "/files", badge: 7 },
];

const pagesYouLike = [
  { name: "UI/UX Community...", avatar: "/placeholder.svg", verified: false },
  { name: "Web Designer", avatar: "/placeholder.svg", verified: false },
  { name: "Dribbble Community", avatar: "/placeholder.svg", verified: false },
  { name: "Behance", avatar: "/placeholder.svg", verified: true },
];

export const LeftSidebar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-[280px] flex-shrink-0 hidden lg:block">
      <div className="fixed w-[280px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8">
        {/* Profile Card */}
        {user && (
          <div className="bg-card rounded-xl p-4 mb-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">
                    {profile?.display_name || "User"}
                  </span>
                  {profile?.is_verified && (
                    <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  @{profile?.username || user.email?.split("@")[0]}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-center">
              <div>
                <div className="font-bold text-foreground">2.3k</div>
                <div className="text-xs text-muted-foreground">Follower</div>
              </div>
              <div>
                <div className="font-bold text-foreground">235</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
              <div>
                <div className="font-bold text-foreground">80</div>
                <div className="text-xs text-muted-foreground">Post</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="bg-card rounded-xl p-2 mb-4 border border-border">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 mb-1 h-11",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
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
          <div className="space-y-3">
            {pagesYouLike.map((page, index) => (
              <div key={index} className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={page.avatar} />
                  <AvatarFallback className="bg-secondary text-sm">
                    {page.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  {page.name}
                  {page.verified && (
                    <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                  )}
                </span>
              </div>
            ))}
            <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm">
              View All
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 px-2 text-xs text-muted-foreground space-x-2">
          <a href="#" className="hover:underline">Privacy terms</a>
          <a href="#" className="hover:underline">Advertising</a>
          <a href="#" className="hover:underline">Cookies</a>
          <div className="mt-1">Platform © 2024</div>
        </div>
      </div>
    </aside>
  );
};
