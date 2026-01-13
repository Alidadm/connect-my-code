import { Search, Bell, Bookmark, ChevronDown, LogOut, Settings, User, ExternalLink, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Demo profile for non-logged in users
const demoProfile = {
  display_name: "Jakob Botosh",
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const Header = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useTranslation();

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

        {/* Search - Desktop */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full h-10"
            />
          </div>
        </div>

        {/* Search - Mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="sm:hidden text-muted-foreground"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Right side actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Language Switcher */}
          <LanguageSwitcher variant="icon" />
          
          {/* Temporary Dev Link to Admin */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => navigate("/adminindex")}
            title="Admin Dashboard (Dev)"
          >
            <Shield className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex">
            <ExternalLink className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex">
            <Bookmark className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 hover:bg-secondary h-9 sm:h-10">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-dolphy-purple text-primary-foreground text-xs sm:text-sm">
                    {displayName?.[0]?.toUpperCase() || "U"}
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
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    {t('header.myProfile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('header.settings')}
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
            <Button onClick={() => navigate("/signup")} className="bg-primary hover:bg-primary/90 ml-1 sm:ml-2 hidden sm:flex h-9 text-sm px-3">
              {t('common.signUp')}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 p-2 bg-card border-b border-border sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};
