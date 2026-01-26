import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  Plus,
  Search,
  Compass,
  CalendarCheck,
  Star,
  Users,
  Loader2,
  Mail,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEvents, useUserEvents, useEventCategories } from "@/hooks/useEvents";
import { EventCard } from "@/components/events/EventCard";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { cn } from "@/lib/utils";

const Events = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useEventCategories();
  const { data: events, isLoading: eventsLoading } = useEvents({
    category: selectedCategory || undefined,
    upcoming: true,
  });
  const { data: userEvents, isLoading: userEventsLoading } = useUserEvents();

  const filteredEvents = events?.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingCount = userEvents
    ? userEvents.attending.filter((e) => new Date(e.start_date) >= new Date()).length
    : 0;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-7 w-7 text-primary" />
              {t("events.title", { defaultValue: "Events" })}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("events.subtitle", {
                defaultValue: "Discover and join events in your community",
              })}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />
            {t("events.createEvent", { defaultValue: "Create Event" })}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("events.searchPlaceholder", {
              defaultValue: "Search events...",
            })}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer px-4 py-1.5"
              onClick={() => setSelectedCategory(null)}
            >
              {t("events.allCategories", { defaultValue: "All" })}
            </Badge>
            {categories?.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.slug ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5 whitespace-nowrap"
                style={
                  selectedCategory === cat.slug
                    ? { backgroundColor: cat.color }
                    : undefined
                }
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.slug ? null : cat.slug
                  )
                }
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="w-full justify-start bg-card border">
            <TabsTrigger value="discover" className="gap-2">
              <Compass className="h-4 w-4" />
              {t("events.discover", { defaultValue: "Discover" })}
            </TabsTrigger>
            {user && (
              <>
                <TabsTrigger value="attending" className="gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  {t("events.myEvents", { defaultValue: "My Events" })}
                  {upcomingCount > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                      {upcomingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="hosting" className="gap-2">
                  <Users className="h-4 w-4" />
                  {t("events.hosting", { defaultValue: "Hosting" })}
                </TabsTrigger>
                <TabsTrigger value="invites" className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t("events.invites", { defaultValue: "Invites" })}
                  {userEvents?.invited && userEvents.invited.length > 0 && (
                    <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">
                      {userEvents.invited.length}
                    </span>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-4">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEvents && filteredEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery
                    ? t("events.noSearchResults", { defaultValue: "No events found" })
                    : t("events.noEvents", { defaultValue: "No Upcoming Events" })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? t("events.tryDifferentSearch", {
                        defaultValue: "Try a different search term",
                      })
                    : t("events.beFirstToCreate", {
                        defaultValue: "Be the first to create an event!",
                      })}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("events.createEvent", { defaultValue: "Create Event" })}
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          {/* My Events Tab */}
          <TabsContent value="attending" className="mt-4">
            {userEventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userEvents?.attending && userEvents.attending.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {userEvents.attending.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("events.noAttendingEvents", {
                    defaultValue: "No Events Yet",
                  })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("events.noAttendingEventsDesc", {
                    defaultValue: "Mark events as Going or Interested to see them here",
                  })}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Hosting Tab */}
          <TabsContent value="hosting" className="mt-4">
            {userEventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userEvents?.created && userEvents.created.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {userEvents.created.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("events.noHostingEvents", {
                    defaultValue: "Not Hosting Any Events",
                  })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("events.noHostingEventsDesc", {
                    defaultValue: "Create an event to bring people together",
                  })}
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("events.createEvent", { defaultValue: "Create Event" })}
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="mt-4">
            {userEventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userEvents?.invited && userEvents.invited.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {userEvents.invited.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("events.noInvites", {
                    defaultValue: "No Event Invites",
                  })}
                </h3>
                <p className="text-muted-foreground">
                  {t("events.noInvitesDesc", {
                    defaultValue: "You'll see event invitations from friends here",
                  })}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </MainLayout>
  );
};

export default Events;
