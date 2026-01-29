import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, MoreVertical, Trash2, ChevronDown, ChevronUp, Flag, Share2, Pin, PinOff } from "lucide-react";
import { GroupPostCommentSection } from "./GroupPostCommentSection";
import { ReportContentDialog } from "./ReportContentDialog";
import { GroupShareDialog } from "./GroupShareDialog";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GroupPost {
  id: string;
  group_id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_verified: boolean | null;
  };
}

interface GroupPostCardProps {
  post: GroupPost;
  onPostChange?: () => void;
  canModerate?: boolean;
}

export const GroupPostCard = ({ post, onPostChange, canModerate }: GroupPostCardProps) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("group_post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        
        // Update post likes count
        await supabase
          .from("group_posts")
          .update({ likes_count: Math.max(0, likesCount - 1) })
          .eq("id", post.id);
      } else {
        // Like
        await supabase
          .from("group_post_likes")
          .insert({ post_id: post.id, user_id: user.id });

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        
        // Update post likes count
        await supabase
          .from("group_posts")
          .update({ likes_count: likesCount + 1 })
          .eq("id", post.id);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("group_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      
      toast.success("Post deleted");
      onPostChange?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleTogglePin = async () => {
    if (!user || !canModerate) return;

    try {
      const newPinnedState = !post.is_pinned;
      const { error } = await supabase
        .from("group_posts")
        .update({ 
          is_pinned: newPinnedState,
          pinned_at: newPinnedState ? new Date().toISOString() : null
        })
        .eq("id", post.id);

      if (error) throw error;
      
      toast.success(newPinnedState ? "Post pinned to top" : "Post unpinned");
      onPostChange?.();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update post");
    }
  };

  // Check if user has already liked this post
  useEffect(() => {
    if (user) {
      supabase
        .from("group_post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsLiked(true);
        });
    }
  }, [user, post.id]);

  const handleCommentCountChange = (count: number) => {
    setCommentsCount(count);
  };

  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || canModerate;
  const canReport = user && !isOwner;

  return (
    <Card className={`overflow-hidden ${post.is_pinned ? "border-primary/50 bg-primary/5" : ""}`}>
      <CardContent className="pt-4">
        {/* Pinned indicator */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 text-primary text-sm mb-3 -mt-1">
            <Pin className="h-3.5 w-3.5" />
            <span className="font-medium">Pinned Post</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.profiles?.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">
                  {post.profiles?.display_name || "Unknown User"}
                </span>
                {post.profiles?.is_verified && (
                  <span className="text-primary text-xs">✓</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                @{post.profiles?.username || "user"} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {(canDelete || canReport || canModerate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border">
                {canModerate && (
                  <DropdownMenuItem onClick={handleTogglePin}>
                    {post.is_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin Post
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin to Top
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {canModerate && (canDelete || canReport) && <DropdownMenuSeparator />}
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                )}
                {canDelete && canReport && <DropdownMenuSeparator />}
                {canReport && (
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-foreground mb-3 whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`grid gap-2 mb-3 ${
            post.media_urls.length === 1 ? "grid-cols-1" : 
            post.media_urls.length === 2 ? "grid-cols-2" : 
            "grid-cols-2"
          }`}>
            {post.media_urls.slice(0, 4).map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`Post media ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likesCount > 0 && likesCount}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            {commentsCount > 0 && commentsCount}
            {showComments ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </CardContent>

      {/* Comment Section */}
      {showComments && (
        <GroupPostCommentSection 
          postId={post.id}
          groupId={post.group_id}
          onCommentCountChange={handleCommentCountChange}
        />
      )}

      {/* Report Dialog */}
      <ReportContentDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        groupId={post.group_id}
        postId={post.id}
        contentType="post"
      />

      {/* Share Dialog */}
      <GroupShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        groupId={post.group_id}
        postId={post.id}
        postContent={post.content}
      />
    </Card>
  );
};
