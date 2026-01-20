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

  // Hide bottom nav since we now use the hamburger drawer
  return null;
};
