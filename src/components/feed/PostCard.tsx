import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreVertical, Bookmark, Play, FileText, Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { CommentSection } from "./CommentSection";
import { ShareDialog } from "./ShareDialog";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Check if user has already liked this post
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      setIsLiked(!!data);
    };

    checkLikeStatus();
  }, [post.id, user]);

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

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: Implement bookmark persistence when bookmarks table is added
  };

  const getMediaType = (url: string): "image" | "video" | "audio" | "document" => {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
    return "document";
  };

  const renderMedia = (url: string, index: number) => {
    const type = getMediaType(url);
    
    switch (type) {
      case "video":
        return (
          <div key={index} className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
            <video
              src={url}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            />
          </div>
        );
      case "audio":
        return (
          <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <audio src={url} controls className="flex-1 h-8" />
          </div>
        );
      case "document":
        const fileName = url.split("/").pop() || "Document";
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-foreground truncate">{fileName}</span>
          </a>
        );
      default:
        return (
          <div key={index} className="relative aspect-square bg-secondary overflow-hidden">
            <img
              src={url}
              alt={`Post media ${index + 1}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
              loading="lazy"
            />
          </div>
        );
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
        <div className="space-y-2 px-4 pb-3">
          {/* Images Grid */}
          {post.media_urls.filter(url => getMediaType(url) === "image").length > 0 && (
            <div className={`grid gap-1 rounded-lg overflow-hidden ${
              post.media_urls.filter(url => getMediaType(url) === "image").length === 1 
                ? 'grid-cols-1' 
                : 'grid-cols-2'
            }`}>
              {post.media_urls
                .filter(url => getMediaType(url) === "image")
                .slice(0, 4)
                .map((url, index) => renderMedia(url, index))}
            </div>
          )}
          
          {/* Videos */}
          {post.media_urls
            .filter(url => getMediaType(url) === "video")
            .map((url, index) => renderMedia(url, index))}
          
          {/* Audio */}
          {post.media_urls
            .filter(url => getMediaType(url) === "audio")
            .map((url, index) => renderMedia(url, index))}
          
          {/* Documents */}
          <div className="space-y-2">
            {post.media_urls
              .filter(url => getMediaType(url) === "document")
              .map((url, index) => renderMedia(url, index))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1 sm:gap-2 ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{likesCount}</span>
            <span className="sm:hidden">{likesCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-1 sm:gap-2 ${showComments ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className={`h-5 w-5 ${showComments ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{commentsCount}</span>
            <span className="sm:hidden">{commentsCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-2 text-muted-foreground"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">{sharesCount}</span>
            <span className="sm:hidden">{sharesCount}</span>
          </Button>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className={isBookmarked ? 'text-primary' : 'text-muted-foreground'}
          onClick={handleBookmark}
        >
          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentSection 
          postId={post.id} 
          onCommentCountChange={setCommentsCount}
        />
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        postId={post.id}
        postContent={post.content}
        onShareComplete={() => setSharesCount(prev => prev + 1)}
      />
    </div>
  );
};
