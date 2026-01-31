import { Bell, Bookmark, ChevronDown, LogOut, Settings, User, ExternalLink, Shield, LayoutDashboard, UserPlus, Check, Lock, HelpCircle, MessageSquarePlus, Search, Newspaper, Info, Menu, MessageCircle, QrCode, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SearchDropdown } from "./SearchDropdown";
import { MobileSearchDropdown } from "./MobileSearchDropdown";
import { MobileDrawer } from "./MobileDrawer";
import { MessagesSheet } from "@/components/messages/MessagesSheet";
import { ReferralQRCodeDialog } from "@/components/referral/ReferralQRCodeDialog";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useMarketplaceMessages } from "@/hooks/useMarketplaceMessages";
import { usePayoutStatus } from "@/hooks/usePayoutStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

// Demo profile for non-logged in users
const demoProfile = {
  display_name: "Jakob Botosh",
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const Header = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const { t } = useTranslation();
  const { totalUnreadCount: dmUnreadCount } = useDirectMessages();
  const { unreadCount: marketplaceUnreadCount } = useMarketplaceMessages();
  const { needsSetup: needsPayoutSetup, loading: payoutLoading } = usePayoutStatus();
  
  // Combined unread count for messages badge
  const totalUnreadCount = dmUnreadCount + marketplaceUnreadCount;

  // Fetch pending friend requests
  useEffect(() => {
    const fetchFriendRequests = async () => {
      if (!user) {
        setFriendRequests([]);
        return;
      }

      const { data: requests, error } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      if (error || !requests) {
        setFriendRequests([]);
        return;
      }

      // Fetch profiles for requesters
      const requesterIds = requests.map(r => r.requester_id);
      if (requesterIds.length === 0) {
        setFriendRequests([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("safe_profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", requesterIds);

      const requestsWithProfiles = requests.map(request => ({
        ...request,
        profile: profiles?.find(p => p.user_id === request.requester_id) || undefined,
      }));

      setFriendRequests(requestsWithProfiles);
    };

    fetchFriendRequests();

    // Subscribe to real-time changes
    if (user) {
      const channel = supabase
        .channel('friend-requests-header')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `addressee_id=eq.${user.id}`,
          },
          () => {
            fetchFriendRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleAcceptRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast.error(t("friends.errorAccepting", { defaultValue: "Failed to accept request" }));
    } else {
      toast.success(t("friends.requestAccepted", { defaultValue: "Friend request accepted!" }));
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

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
    navigate("/login");
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || demoProfile.display_name;
  const avatarUrl = profile?.avatar_url || demoProfile.avatar_url;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-card border-b border-border z-50">
      <div className="flex items-center justify-between h-full px-2 sm:px-4 max-w-[1920px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate("/")}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl dolphy-gradient flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-lg sm:text-xl">D</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground hidden xs:block">DolphySN</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <Newspaper className="h-4 w-4" />
            {t("nav.feed")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/about")}
          >
            <Info className="h-4 w-4" />
            {t("nav.about", { defaultValue: "About" })}
          </Button>
          
          {/* Payout Setup Reminder - Shows when user hasn't set up both payment methods */}
          {user && !payoutLoading && needsPayoutSetup && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-950 relative animate-pulse h-auto py-1.5"
                    onClick={() => navigate("/commissions")}
                  >
                    <CreditCard className="h-4 w-4" />
                    <div className="hidden lg:flex flex-col items-start leading-tight">
                      <span className="text-sm font-medium">{t("header.setupPayout", { defaultValue: "Setup Payout" })}</span>
                      <span className="text-[10px] text-muted-foreground">{t("header.getCommission", { defaultValue: "Get Commission" })}</span>
                    </div>
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      !
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    {t("header.payoutReminder", { 
                      defaultValue: "Please set up both Stripe and PayPal to receive commissions from all referrals. Click to configure." 
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </nav>

        {/* Search - Desktop */}
        <div className="hidden sm:flex flex-1 justify-center px-4">
          <div className="w-full max-w-md">
            <SearchDropdown />
          </div>
        </div>

        {/* Search - Mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="sm:hidden text-muted-foreground"
          onClick={() => setSearchOpen(!searchOpen)}
          title={t("header.search", { defaultValue: "Search" })}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Right side actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Language Switcher */}
          <LanguageSwitcher variant="icon" />
          
          {/* Admin Dashboard Link - Only visible to admin users - Desktop only */}
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 h-9 w-9 sm:h-10 sm:w-10 hidden lg:flex"
              onClick={() => navigate("/adminindex")}
              title="Admin Dashboard"
            >
              <Shield className="h-5 w-5" />
            </Button>
          )}

          {/* Messages - Direct Messaging */}
          {user && (
            <MessagesSheet>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 relative"
                title={t("messages.title", { defaultValue: "Messages" })}
              >
                <MessageCircle className="h-5 w-5" />
                {totalUnreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                  </Badge>
                )}
              </Button>
            </MessagesSheet>
          )}

          {/* Friend Request Notifications */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 relative"
                  title={t("header.friendRequests", { defaultValue: "Friend Requests" })}
                >
                  <Bell className="h-5 w-5" />
                  {friendRequests.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {friendRequests.length > 9 ? "9+" : friendRequests.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b border-border">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("friends.friendRequests", { defaultValue: "Friend Requests" })}
                  </h4>
                </div>
                {friendRequests.length === 0 ? (
                  <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {t("friends.noRequests", { defaultValue: "No pending friend requests" })}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {friendRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer"
                        onClick={() => navigate("/friends")}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-dolphy-purple text-primary-foreground text-sm">
                            {request.profile?.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {request.profile?.display_name || t("common.unknownUser", { defaultValue: "Unknown User" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("friends.wantsToBeYourFriend", { defaultValue: "Wants to be your friend" })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 px-3"
                          onClick={(e) => handleAcceptRequest(request.id, e)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate("/friends")}
                  className="justify-center text-primary"
                >
                  {t("friends.viewAll", { defaultValue: "View All Requests" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 hidden lg:flex"
            title={t("header.externalLink", { defaultValue: "External Link" })}
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 hidden lg:flex"
            title={t("nav.saved", { defaultValue: "Saved" })}
            onClick={() => navigate("/saved")}
          >
            <Bookmark className="h-5 w-5" />
          </Button>

          {/* Referral URL Barcode - Quick Access for logged in users */}
          {user && (
            <ReferralQRCodeDialog>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-2 gap-1.5 flex items-center"
                title={t('header.referralUrl', { defaultValue: 'Referral URL' })}
              >
                <QrCode className="h-4 w-4" />
                <span className="text-xs font-medium hidden sm:inline">{t('header.referralUrl', { defaultValue: 'Referral URL' })}</span>
              </Button>
            </ReferralQRCodeDialog>
          )}

          {/* User dropdown - Desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hidden lg:flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 hover:bg-secondary h-9 sm:h-10">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
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
                <span className="hidden md:block text-sm font-medium text-foreground max-w-[100px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('header.dashboard', { defaultValue: 'Dashboard' })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <ReferralQRCodeDialog>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <QrCode className="mr-2 h-4 w-4" />
                      {t('header.qrBarcode', { defaultValue: 'Referral URL Barcode' })}
                    </DropdownMenuItem>
                  </ReferralQRCodeDialog>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('header.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/privacy")}>
                    <Lock className="mr-2 h-4 w-4" />
                    {t('header.privacy', { defaultValue: 'Privacy Settings' })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/help")}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {t('header.helpSupport', { defaultValue: 'Help & Support' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/feedback")}>
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    {t('header.giveFeedback', { defaultValue: 'Give Feedback' })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('header.logOut')}
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/login")}>
                    <User className="mr-2 h-4 w-4" />
                    {t('common.logIn')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/signup")} className="text-primary focus:text-primary">
                    <User className="mr-2 h-4 w-4" />
                    {t('common.signUp')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {!user && (
            <Button onClick={() => navigate("/signup")} className="bg-primary hover:bg-primary/90 ml-1 sm:ml-2 hidden lg:flex h-9 text-sm px-3">
              {t('common.signUp')}
            </Button>
          )}

          {/* Hamburger Menu - Mobile/Tablet only */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <MobileSearchDropdown onClose={() => setSearchOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} />
    </header>
  );
};
