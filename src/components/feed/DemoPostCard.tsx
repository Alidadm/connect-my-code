import { Heart, MessageCircle, Share2, MoreVertical, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DemoPostCardProps {
  post: {
    id: string;
    author: {
      name: string;
      avatar: string;
    };
    time: string;
    content?: string;
    images?: string[];
    likes: number;
    comments: number;
    shares: number;
  };
}

export const DemoPostCard = ({ post }: DemoPostCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground">
              {post.author.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-foreground">{post.author.name}</div>
            <div className="text-xs text-muted-foreground">{post.time}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Media Grid */}
      {post.images && post.images.length > 0 && (
        <div className={`grid gap-0.5 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.slice(0, 4).map((url, index) => (
            <div 
              key={index} 
              className={`relative bg-secondary ${post.images!.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}`}
            >
              <img
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3">
            <Heart className="h-5 w-5" />
            <span className="text-sm">{post.likes} Like</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{post.comments} Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3">
            <Share2 className="h-5 w-5" />
            <span className="text-sm">{post.shares} Share</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
