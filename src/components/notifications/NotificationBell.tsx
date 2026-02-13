import { Bell, UserPlus, Heart, MessageSquare, Calendar, Users, Check, CheckCheck, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case "post_like":
      return <Heart className="h-4 w-4 text-red-500" />;
    case "post_comment":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "event_invite":
    case "event_reminder":
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case "group_invite":
      return <Users className="h-4 w-4 text-orange-500" />;
    case "birthday":
      return <span className="text-sm">🎂</span>;
    case "penpal_request":
      return <Sparkles className="h-4 w-4 text-pink-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationRoute = (notification: Notification): string | null => {
  switch (notification.reference_type) {
    case "post":
      return notification.reference_id ? `/post/${notification.reference_id}` : null;
    case "event":
      return notification.reference_id ? `/events/${notification.reference_id}` : null;
    case "group":
      return notification.reference_id ? `/groups/${notification.reference_id}` : null;
    case "friendship":
      return "/friends";
    case "penpal":
      return "/penpals";
    default:
      return null;
  }
};

export const NotificationBell = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 relative"
          title={t("notifications.title", { defaultValue: "Notifications" })}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("notifications.title", { defaultValue: "Notifications" })}
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {t("notifications.markAllRead", { defaultValue: "Mark all read" })}
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {t("common.loading", { defaultValue: "Loading..." })}
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t("notifications.empty", { defaultValue: "No notifications yet" })}
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Actor avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.actor_profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm">
                        {notification.actor_profile?.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notification.is_read ? "font-medium" : "text-muted-foreground"}`}>
                      {notification.message || notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
