import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Heart, 
  Clock, 
  Tag, 
  Settings,
  ChevronLeft,
  Store,
  Package,
  TrendingUp
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface MarketplaceSidebarProps {
  onCreateListing: () => void;
  unreadMessages?: number;
}

const navItems = [
  { 
    id: "browse", 
    icon: Search, 
    label: "Browse All", 
    path: "/marketplace",
    iconColor: "text-blue-500"
  },
  { 
    id: "inbox", 
    icon: MessageSquare, 
    label: "Inbox", 
    path: "/marketplace?tab=inbox",
    iconColor: "text-green-500",
    showBadge: true
  },
  { 
    id: "saved", 
    icon: Heart, 
    label: "Saved Items", 
    path: "/marketplace?tab=saved",
    iconColor: "text-red-500"
  },
  { 
    id: "my-listings", 
    icon: Package, 
    label: "My Listings", 
    path: "/marketplace?tab=my-listings",
    iconColor: "text-purple-500"
  },
  { 
    id: "recent", 
    icon: Clock, 
    label: "Recently Viewed", 
    path: "/marketplace?tab=recent",
    iconColor: "text-orange-500"
  },
];

const categoryLinks = [
  { id: "deals", icon: Tag, label: "Today's Deals", path: "/marketplace?filter=deals" },
  { id: "trending", icon: TrendingUp, label: "Trending", path: "/marketplace?filter=trending" },
];

export const MarketplaceSidebar = ({ onCreateListing, unreadMessages = 0 }: MarketplaceSidebarProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentTab = new URLSearchParams(location.search).get("tab") || "browse";

  const isActive = (itemId: string) => {
    if (itemId === "browse" && !location.search) return true;
    return currentTab === itemId;
  };

  return (
    <aside className="w-[280px] flex-shrink-0 hidden lg:block">
      <div className="fixed w-[280px] h-screen overflow-y-auto scrollbar-hide py-4 pr-2 bg-background border-r border-border">
        {/* Back to Feed */}
        <div className="px-2 mb-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </div>

        {/* Marketplace Header */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Marketplace</h1>
              <p className="text-xs text-muted-foreground">Buy & Sell locally</p>
            </div>
          </div>
        </div>

        {/* Create Listing Button */}
        <div className="px-2 mb-4">
          <Button 
            className="w-full gap-2" 
            onClick={onCreateListing}
          >
            <Plus className="h-4 w-4" />
            Create New Listing
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="px-2 mb-6">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 font-medium",
                  isActive(item.id) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.id) ? "" : item.iconColor)} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.showBadge && unreadMessages > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </nav>

        {/* Divider */}
        <div className="px-4 mb-4">
          <div className="border-t border-border" />
        </div>

        {/* Quick Links */}
        <div className="px-2 mb-6">
          <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Links
          </h3>
          <hr className="border-border my-3 mx-2" />
          <div className="space-y-1">
            {categoryLinks.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="px-2 mt-auto">
            <div className="bg-card rounded-xl p-3 border border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted">
                    {profile?.display_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.display_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">Seller Profile</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 px-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <a href="/terms" className="hover:underline">Terms</a>
            <span>·</span>
            <a href="/privacy-policy" className="hover:underline">Privacy</a>
            <span>·</span>
            <a href="/help" className="hover:underline">Help</a>
          </div>
        </div>
      </div>
    </aside>
  );
};
