import { Image, Paperclip, Radio, Hash, AtSign, Globe, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoProfile = {
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const DemoPostCreator = () => {
  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border mb-4">
      <div className="flex gap-2 sm:gap-3 items-center">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={demoProfile.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-sm">
            JB
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Input
            placeholder="What's on your mind?"
            className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full h-9 sm:h-10 text-sm"
            readOnly
          />
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex">
          <Smile className="h-5 w-5" />
        </Button>
        <Button className="bg-primary hover:bg-primary/90 flex-shrink-0 h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
          Share Post
        </Button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-0 sm:gap-0.5 overflow-x-auto scrollbar-hide">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0">
            <Image className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">Image/Video</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0">
            <Paperclip className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">Attachment</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0">
            <Radio className="h-4 w-4 text-red-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">Live</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0 hidden sm:flex">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-[10px] sm:text-xs hidden md:inline">Hashtag</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0 hidden sm:flex">
            <AtSign className="h-4 w-4 text-weshare-purple" />
            <span className="text-[10px] sm:text-xs hidden md:inline">Mention</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 h-8 sm:h-9 px-2 flex-shrink-0">
          <Globe className="h-4 w-4" />
          <span className="text-[10px] sm:text-xs">Public</span>
        </Button>
      </div>
    </div>
  );
};
