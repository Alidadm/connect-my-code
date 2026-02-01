import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MarketplaceSidebar } from "./MarketplaceSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Store, 
  Plus, 
  Search, 
  MessageSquare, 
  Heart, 
  Package 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketplaceLayoutProps {
  children: ReactNode;
  onCreateListing: () => void;
  unreadMessages?: number;
}

export const MarketplaceLayout = ({ children, onCreateListing, unreadMessages }: MarketplaceLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab") || "browse";

  const mobileNavItems = [
    { id: "browse", icon: Search, path: "/marketplace" },
    { id: "inbox", icon: MessageSquare, path: "/marketplace?tab=inbox", showBadge: true },
    { id: "saved", icon: Heart, path: "/marketplace?tab=saved" },
    { id: "my-listings", icon: Package, path: "/marketplace?tab=my-listings" },
  ];

  const isActive = (itemId: string) => {
    if (itemId === "browse" && !location.search) return true;
    return currentTab === itemId;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile/Tablet Header - visible on screens smaller than lg */}
      <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border">
        {/* Top bar with back button and title */}
        <div className="flex items-center justify-between px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Feed</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-semibold">Marketplace</span>
          </div>
          
          <Button 
            size="sm"
            className="gap-1"
            onClick={onCreateListing}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Sell</span>
          </Button>
        </div>
        
        {/* Bottom navigation tabs */}
        <div className="flex items-center justify-around border-t border-border">
          {mobileNavItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 flex-col gap-0.5 h-14 rounded-none relative",
                isActive(item.id) 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] capitalize">{item.id.replace("-", " ")}</span>
              {item.showBadge && unreadMessages && unreadMessages > 0 ? (
                <Badge 
                  variant="destructive" 
                  className="absolute top-1 right-1/4 h-4 min-w-[16px] px-1 text-[10px]"
                >
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </Badge>
              ) : null}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex">
        <MarketplaceSidebar 
          onCreateListing={onCreateListing} 
          unreadMessages={unreadMessages}
        />
        <main className="flex-1 min-w-0 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
};
