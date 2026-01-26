import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, ChevronRight, Plus } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";

interface UpcomingEventsWidgetProps {
  limit?: number;
  showCreateButton?: boolean;
}

export const UpcomingEventsWidget = ({
  limit = 3,
  showCreateButton = true,
}: UpcomingEventsWidgetProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: events, isLoading } = useEvents({ upcoming: true });

  const upcomingEvents = events?.slice(0, limit) || [];

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return t("events.today", { defaultValue: "Today" });
    }
    if (isTomorrow(date)) {
      return t("events.tomorrow", { defaultValue: "Tomorrow" });
    }
    return format(date, "EEE, MMM d");
  };

  if (isLoading) {
    return (
      <Card className="sidebar-widget-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {t("events.upcomingEvents", { defaultValue: "Upcoming Events" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sidebar-widget-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {t("events.upcomingEvents", { defaultValue: "Upcoming Events" })}
          </CardTitle>
          {showCreateButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate("/events?create=true")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 cursor-pointer hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {/* Date box */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-primary uppercase">
                    {format(new Date(event.start_date), "MMM")}
                  </span>
                  <span className="text-lg font-bold text-primary leading-none">
                    {format(new Date(event.start_date), "d")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{event.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {formatEventDate(event.start_date)} •{" "}
                    {format(new Date(event.start_date), "h:mm a")}
                  </p>
                  {event.location_name && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {event.location_name}
                    </p>
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="link"
              className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground w-full justify-start"
              onClick={() => navigate("/events")}
            >
              {t("events.viewAllEvents", { defaultValue: "View all events" })}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {t("events.noUpcomingEvents", {
                defaultValue: "No upcoming events",
              })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/events")}
            >
              {t("events.discoverEvents", { defaultValue: "Discover Events" })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
