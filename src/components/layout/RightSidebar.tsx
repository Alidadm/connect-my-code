import { Search, Edit, Calendar, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const messages = [
  { name: "Roger Korsgaard", avatar: "/placeholder.svg", online: true },
  { name: "Terry Torff", avatar: "/placeholder.svg", online: true },
  { name: "Angel Bergson", avatar: "/placeholder.svg", online: false },
  { name: "Emerson Culhane", avatar: "/placeholder.svg", online: true },
  { name: "Corey Baptista", avatar: "/placeholder.svg", online: false },
  { name: "Zain Culhane", avatar: "/placeholder.svg", online: true },
  { name: "Randy Lipshutz", avatar: "/placeholder.svg", online: false },
  { name: "Craig Botosh", avatar: "/placeholder.svg", online: true },
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
  return (
    <aside className="w-[320px] flex-shrink-0 hidden xl:block">
      <div className="fixed w-[320px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8">
        {/* Messages */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Messages</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 h-9 bg-secondary border-0 text-sm"
            />
          </div>

          <Tabs defaultValue="primary" className="w-full">
            <TabsList className="w-full bg-secondary h-9 p-1">
              <TabsTrigger value="primary" className="flex-1 text-xs">Primary</TabsTrigger>
              <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 text-xs relative">
                Requests
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] p-0 flex items-center justify-center bg-primary">
                  4
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="primary" className="mt-3 space-y-1">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.avatar} />
                      <AvatarFallback className="bg-secondary text-sm">
                        {message.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {message.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-weshare-online rounded-full border-2 border-card" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{message.name}</span>
                </div>
              ))}
              <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm">
                View All
              </Button>
            </TabsContent>
            <TabsContent value="general" className="mt-3">
              <p className="text-sm text-muted-foreground text-center py-4">No general messages</p>
            </TabsContent>
            <TabsContent value="requests" className="mt-3">
              <p className="text-sm text-muted-foreground text-center py-4">4 message requests</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Events */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Events</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg">
                  {event.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{event.title}</div>
                  {event.subtitle && (
                    <div className="text-xs text-muted-foreground">{event.subtitle}</div>
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
