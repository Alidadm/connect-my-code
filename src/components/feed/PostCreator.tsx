import { useState } from "react";
import { Image, Paperclip, Radio, Hash, AtSign, Globe, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const PostCreator = ({ onPostCreated }: { onPostCreated?: () => void }) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        visibility,
      });

      if (error) throw error;

      setContent("");
      toast({
        title: "Post shared!",
        description: "Your post has been published successfully.",
      });
      onPostCreated?.();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card rounded-xl p-4 border border-border mb-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {profile?.display_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[60px] resize-none border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            Share Post
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <Image className="h-4 w-4 text-weshare-success" />
            <span className="hidden sm:inline">Image/Video</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <Paperclip className="h-4 w-4 text-weshare-warning" />
            <span className="hidden sm:inline">Attachment</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <Radio className="h-4 w-4 text-destructive" />
            <span className="hidden sm:inline">Live</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Hashtag</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
            <AtSign className="h-4 w-4 text-weshare-purple" />
            <span className="hidden sm:inline">Mention</span>
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Globe className="h-4 w-4" />
              {visibility === "public" ? "Public" : visibility === "friends" ? "Friends" : "Private"}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setVisibility("public")}>
              Public
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVisibility("friends")}>
              Friends Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVisibility("private")}>
              Private
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
