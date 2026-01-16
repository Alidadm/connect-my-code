import { Search, MoreVertical, Calendar, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface MessageWithSender {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"notification" | "unread">("notification");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Fetch messages where user is receiver
        const { data: messagesData, error } = await supabase
          .from("messages")
          .select("*")
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (messagesData && messagesData.length > 0) {
          // Get unique sender IDs
          const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
          
          // Fetch sender profiles
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, username")
            .in("user_id", senderIds);

          // Map profiles to messages
          const messagesWithSenders = messagesData.map(msg => ({
            ...msg,
            sender: profiles?.find(p => p.user_id === msg.sender_id) || null
          }));

          setMessages(messagesWithSenders);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filter messages based on tab
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = searchQuery === "" || 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "notification") {
      // Show recent messages (last 24 hours) that are new
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(msg.created_at) > dayAgo;
    } else {
      // Show unread messages (read_at is null)
      return msg.read_at === null;
    }
  });

  const handleMessageClick = (msg: MessageWithSender) => {
    // Navigate to member dashboard with messages tab
    navigate("/dashboard?tab=messages&sender=" + msg.sender_id);
  };

  const truncateMessage = (content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const unreadCount = messages.filter(m => m.read_at === null).length;

  return (
    <aside className="w-[320px] flex-shrink-0 hidden xl:block">
      <div className="fixed w-[320px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8 pl-2">
        {/* Notifications */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">{t("notifications.title", "Notifications")}</h3>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary border-0 text-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1 mb-3">
            {(["notification", "unread"] as const).map((tab) => (
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
                {tab === "notification" ? t("notifications.new", "Notification") : t("notifications.unread", "Unread")}
                {tab === "unread" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] p-0.5 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="space-y-1">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("common.loading", "Loading...")}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {activeTab === "notification" 
                  ? t("notifications.noNew", "No new notifications") 
                  : t("notifications.noUnread", "No unread messages")}
              </div>
            ) : (
              filteredMessages.slice(0, 8).map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={cn(
                    "flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors",
                    !msg.read_at && "bg-primary/5"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-sm">
                        {msg.sender?.display_name?.split(" ").map(n => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {!msg.read_at && (
                      <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-primary rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-sm truncate",
                        !msg.read_at ? "font-semibold text-foreground" : "font-medium text-foreground"
                      )}>
                        {msg.sender?.display_name || t("common.unknown", "Unknown")}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      !msg.read_at ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {truncateMessage(msg.content)}
                    </p>
                  </div>
                </div>
              ))
            )}
            {filteredMessages.length > 8 && (
              <Button 
                variant="link" 
                className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground"
                onClick={() => navigate("/dashboard?tab=messages")}
              >
                {t("sidebar.viewAll", "View All")}
              </Button>
            )}
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