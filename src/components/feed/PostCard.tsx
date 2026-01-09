import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreVertical, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    media_urls: string[] | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    user_id: string;
    profiles?: {
      display_name: string | null;
      avatar_url: string | null;
      username: string | null;
      is_verified: boolean | null;
    };
  };
  onLikeChange?: () => void;
}

export const PostCard = ({ post, onLikeChange }: PostCardProps) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from("post_likes").insert({
          post_id: post.id,
          user_id: user.id,
        });
        
        setLikesCount(prev => prev + 1);
      }
      
      setIsLiked(!isLiked);
      onLikeChange?.();
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const profile = post.profiles;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.display_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-foreground">
              {profile?.display_name || "Unknown User"}
            </div>
            <div className="text-xs text-muted-foreground">{timeAgo}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={`grid gap-1 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.media_urls.slice(0, 4).map((url, index) => (
            <div key={index} className="relative aspect-square bg-secondary">
              <img
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount} Like</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments_count || 0} Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Share2 className="h-5 w-5" />
            <span>{post.shares_count || 0} Share</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
