import { Newspaper, Users, MessageCircle, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const getNavItems = (t: (key: string) => string) => [
  { icon: Newspaper, label: t("nav.feed"), path: "/" },
  { icon: Users, label: t("nav.friends"), path: "/friends" },
  { icon: MessageCircle, label: t("nav.messages"), path: "/messages" },
  { icon: Bell, label: t("nav.notifications"), path: "/notifications" },
  { icon: User, label: t("common.profile"), path: "/profile" },
];

export const MobileNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = getNavItems(t);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 lg:hidden">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
