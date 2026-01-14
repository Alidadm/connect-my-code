import { Heart, MessageCircle, Share2, MoreVertical, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleActionClick = () => {
    if (!user) {
      toast.info(t("auth.loginRequired", "Please log in to interact with posts"), {
        action: {
          label: t("common.logIn", "Log In"),
          onClick: () => navigate("/login"),
        },
      });
    } else {
      toast.info(t("feed.demoPostInfo", "This is a demo post. Create your own post to interact!"));
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-3 sm:mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-sm">
              {post.author.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-sm sm:text-base truncate">{post.author.name}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{post.time}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
          <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Media Grid */}
      {post.images && post.images.length > 0 && (
        <div className={`grid gap-0.5 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.images.slice(0, 4).map((url, index) => (
            <div 
              key={index} 
              className={`relative bg-secondary ${post.images!.length === 1 ? 'aspect-[16/10] sm:aspect-[16/9]' : 'aspect-square'}`}
            >
              <img
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <p className="text-foreground whitespace-pre-wrap text-sm sm:text-base">{post.content}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-border">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3 h-8 sm:h-9"
            onClick={handleActionClick}
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">{post.likes}</span>
            <span className="hidden xs:inline text-xs sm:text-sm">Like</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3 h-8 sm:h-9"
            onClick={handleActionClick}
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">{post.comments}</span>
            <span className="hidden sm:inline text-xs sm:text-sm">Comment</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground px-2 sm:px-3 h-8 sm:h-9"
            onClick={handleActionClick}
          >
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">{post.shares}</span>
            <span className="hidden sm:inline text-xs sm:text-sm">Share</span>
          </Button>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9"
          onClick={handleActionClick}
        >
          <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};
