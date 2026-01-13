import { Search, Edit, MoreVertical, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const messages = [
  { name: "Roger Korsgaard", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop", online: true },
  { name: "Terry Torff", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop", online: true },
  { name: "Angel Bergson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop", online: false },
  { name: "Emerson Culhane", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=50&h=50&fit=crop", online: true },
  { name: "Corey Baptista", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop", online: false },
  { name: "Zain Culhane", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=50&h=50&fit=crop", online: true },
  { name: "Randy Lipshutz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop", online: false },
  { name: "Craig Botosh", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=50&h=50&fit=crop", online: true },
];

const events = [
  { 
    title: "10 Events Invites", 
    subtitle: null,
    icon: "📅"
  },
  { 
    title: "Design System Collaboration", 
    subtitle: "Thu - Harpoon Mall, YK",
    icon: "🎨"
  },
  { 
    title: "Web Dev 2.0 Meetup", 
    subtitle: "Yoshkar-Ola, Russia",
    icon: "💻"
  },
  { 
    title: "Prada's Invitation Birthday", 
    subtitle: null,
    icon: "🎂"
  },
];

export const RightSidebar = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"primary" | "general" | "requests">("primary");

  return (
    <aside className="w-[320px] flex-shrink-0 hidden xl:block">
      <div className="fixed w-[320px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8 pl-2">
        {/* Messages */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">{t("messages.title")}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              className="pl-9 h-9 bg-secondary border-0 text-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1 mb-3">
            {(["primary", "general", "requests"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors capitalize relative",
                  activeTab === tab 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`messages.${tab}`)}
                {tab === "requests" && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] p-0 flex items-center justify-center bg-primary border-0">
                    4
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-sm">
                      {message.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  {message.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-weshare-success rounded-full border-2 border-card" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">{message.name}</span>
              </div>
            ))}
            <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground">
              {t("sidebar.viewAll")}
            </Button>
          </div>
        </div>

        {/* Events */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">{t("events.title")}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base flex-shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
                  {event.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">{event.subtitle}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
