import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const demoStories = [
  { id: "add", name: "Your Story", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", isAdd: true },
  { id: "1", name: "Justin Rosser", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", isAdd: false },
  { id: "2", name: "Davis Dorwart", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", isAdd: false },
  { id: "3", name: "Randy Saris", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop", isAdd: false },
  { id: "4", name: "Charlie Press", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop", isAdd: false },
  { id: "5", name: "Zaire Herwitz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", isAdd: false },
  { id: "6", name: "Talan Philips", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", isAdd: false },
  { id: "7", name: "Corey Goose", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop", isAdd: false },
];

export const StoriesRow = () => {
  return (
    <div className="mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 pb-2">
        {demoStories.map((story) => (
          <div
            key={story.id}
            className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0"
          >
            <div className={`relative rounded-full ${!story.isAdd ? 'p-[3px] bg-gradient-to-br from-primary via-weshare-purple to-pink-500' : ''}`}>
              <div className={`rounded-full ${!story.isAdd ? 'p-[2px] bg-card' : ''}`}>
                <Avatar className="h-16 w-16">
                  {story.isAdd ? (
                    <div className="w-full h-full flex items-center justify-center bg-secondary relative">
                      <AvatarImage src={story.avatar} className="opacity-70" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                        <Plus className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={story.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground">
                        {story.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              </div>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors max-w-[70px] truncate text-center">
              {story.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
