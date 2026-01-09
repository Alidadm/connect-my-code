import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const demoStories = [
  { id: "add", name: "Your Story", avatar: "/placeholder.svg", isAdd: true },
  { id: "1", name: "Justin Rosser", avatar: "/placeholder.svg", isAdd: false },
  { id: "2", name: "Davis Dorwart", avatar: "/placeholder.svg", isAdd: false },
  { id: "3", name: "Randy Saris", avatar: "/placeholder.svg", isAdd: false },
  { id: "4", name: "Charlie Press", avatar: "/placeholder.svg", isAdd: false },
  { id: "5", name: "Zaire Herwitz", avatar: "/placeholder.svg", isAdd: false },
  { id: "6", name: "Talan Philips", avatar: "/placeholder.svg", isAdd: false },
  { id: "7", name: "Corey Goose", avatar: "/placeholder.svg", isAdd: false },
];

export const StoriesRow = () => {
  return (
    <div className="mb-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {demoStories.map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div className={`relative p-0.5 rounded-full ${!story.isAdd ? 'story-ring' : ''}`}>
                <Avatar className={`h-16 w-16 border-2 border-card ${!story.isAdd ? '' : 'bg-secondary'}`}>
                  {story.isAdd ? (
                    <div className="w-full h-full flex items-center justify-center bg-weshare-blue-light">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Plus className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={story.avatar} />
                      <AvatarFallback className="bg-secondary">
                        {story.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors max-w-[70px] truncate">
                {story.name}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
