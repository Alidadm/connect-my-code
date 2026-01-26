import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Star,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, useRSVP, useEventCategories } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";

interface EventCardProps {
  event: Event;
  variant?: "default" | "compact";
}

export const EventCard = ({ event, variant = "default" }: EventCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: categories } = useEventCategories();
  const rsvpMutation = useRSVP();

  const startDate = new Date(event.start_date);
  const category = categories?.find((c) => c.slug === event.category);

  const formatEventDate = () => {
    if (isToday(startDate)) {
      return t("events.today", { defaultValue: "Today" });
    }
    if (isTomorrow(startDate)) {
      return t("events.tomorrow", { defaultValue: "Tomorrow" });
    }
    return format(startDate, "EEE, MMM d");
  };

  const handleRSVP = async (status: "going" | "interested" | null) => {
    if (!user) {
      navigate("/login");
      return;
    }
    await rsvpMutation.mutateAsync({ eventId: event.id, status });
  };

  if (variant === "compact") {
    return (
      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Date box */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
              <span className="text-xs font-medium text-primary uppercase">
                {format(startDate, "MMM")}
              </span>
              <span className="text-lg font-bold text-primary">
                {format(startDate, "d")}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{event.title}</h3>
              <p className="text-xs text-muted-foreground">
                {format(startDate, "h:mm a")}
              </p>
              {event.location_name && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {event.location_name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      {/* Cover Image */}
      <div
        className={cn(
          "h-40 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative",
          event.cover_url && "bg-none"
        )}
      >
        {event.cover_url && (
          <img
            src={event.cover_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* Category badge */}
        {category && (
          <Badge
            className="absolute top-3 left-3"
            style={{ backgroundColor: category.color }}
          >
            <span className="mr-1">{category.icon}</span>
            {category.name}
          </Badge>
        )}

        {/* Date overlay */}
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs font-medium text-primary uppercase">
            {format(startDate, "MMM")}
          </p>
          <p className="text-2xl font-bold">{format(startDate, "d")}</p>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title & Creator */}
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {event.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <CalendarDays className="h-4 w-4" />
          <span>{formatEventDate()}</span>
          <span>•</span>
          <Clock className="h-4 w-4" />
          <span>{format(startDate, "h:mm a")}</span>
        </div>

        {event.location_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.location_name}</span>
          </div>
        )}

        {/* Creator */}
        {event.creator && (
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="h-6 w-6">
              <AvatarImage src={event.creator.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {event.creator.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {t("events.hostedBy", { defaultValue: "Hosted by" })}{" "}
              <span className="font-medium text-foreground">
                {event.creator.display_name}
              </span>
            </span>
          </div>
        )}

        {/* Stats & RSVP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              {event.going_count} {t("events.going", { defaultValue: "going" })}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              {event.interested_count} {t("events.interested", { defaultValue: "interested" })}
            </span>
          </div>

          {user && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant={event.user_rsvp === "going" ? "default" : "outline"}
                onClick={() =>
                  handleRSVP(event.user_rsvp === "going" ? null : "going")
                }
                disabled={rsvpMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {t("events.going", { defaultValue: "Going" })}
              </Button>
              <Button
                size="sm"
                variant={event.user_rsvp === "interested" ? "secondary" : "ghost"}
                onClick={() =>
                  handleRSVP(
                    event.user_rsvp === "interested" ? null : "interested"
                  )
                }
                disabled={rsvpMutation.isPending}
              >
                <Star className="h-4 w-4 mr-1" />
                {t("events.interested", { defaultValue: "Interested" })}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
