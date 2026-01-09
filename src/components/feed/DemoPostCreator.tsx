import { Image, Paperclip, Radio, Hash, AtSign, Globe, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoProfile = {
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const DemoPostCreator = () => {
  return (
    <div className="bg-card rounded-xl p-4 border border-border mb-4">
      <div className="flex gap-3 items-center">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={demoProfile.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground">
            JB
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Input
            placeholder="What's on your mind?"
            className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full h-10"
            readOnly
          />
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0">
          <Smile className="h-5 w-5" />
        </Button>
        <Button className="bg-primary hover:bg-primary/90 flex-shrink-0">
          Share Post
        </Button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 px-2 sm:px-3">
            <Image className="h-4 w-4 text-emerald-500" />
            <span className="text-xs sm:text-sm">Image/Video</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 px-2 sm:px-3">
            <Paperclip className="h-4 w-4 text-amber-500" />
            <span className="text-xs sm:text-sm">Attachment</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 px-2 sm:px-3">
            <Radio className="h-4 w-4 text-red-500" />
            <span className="text-xs sm:text-sm">Live</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 px-2 sm:px-3 hidden md:flex">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm">Hashtag</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 px-2 sm:px-3 hidden md:flex">
            <AtSign className="h-4 w-4 text-weshare-purple" />
            <span className="text-xs sm:text-sm">Mention</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Public</span>
        </Button>
      </div>
    </div>
  );
};
