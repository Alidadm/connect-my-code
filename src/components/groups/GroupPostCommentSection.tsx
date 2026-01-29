import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Reply, X, Trash2, Heart, Pencil, Check, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ReportContentDialog } from "./ReportContentDialog";

interface GroupComment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  replies?: GroupComment[];
  likesCount?: number;
  isLiked?: boolean;
}

interface GroupPostCommentSectionProps {
  postId: string;
  groupId: string;
  onCommentCountChange?: (count: number) => void;
}

interface CommentItemProps {
  comment: GroupComment;
  groupId: string;
  onReply: (commentId: string, displayName: string) => void;
  onDelete: (commentId: string, hasReplies: boolean) => void;
  onLike: (commentId: string, isLiked: boolean) => void;
  onEdit: (commentId: string, newContent: string) => void;
  isReply?: boolean;
}

const CommentItem = ({ comment, groupId, onReply, onDelete, onLike, onEdit, isReply = false }: CommentItemProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const hasReplies = (comment.replies?.length || 0) > 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const wasEdited = comment.updated_at !== comment.created_at;
  const canReport = user && !isOwner;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== comment.content) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };
  
  return (
    <div className={`flex gap-2 ${isReply ? "ml-10" : ""}`}>
      <Avatar className={`flex-shrink-0 ${isReply ? "h-6 w-6" : "h-8 w-8"}`}>
        <AvatarImage src={comment.profiles?.avatar_url || ""} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {comment.profiles?.display_name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        {/* Speech bubble with arrow pointing to avatar */}
        <div className="bg-muted border border-border rounded-lg px-3 py-2 group relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[-11px] top-3 block h-4 w-3 bg-border [clip-path:polygon(100%_50%,0_0,0_100%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-[-10px] top-3 block h-4 w-3 bg-muted [clip-path:polygon(100%_50%,0_0,0_100%)]"
          />
          <p className={`font-medium text-foreground ${isReply ? "text-xs" : "text-sm"}`}>
            {comment.profiles?.display_name || "Unknown User"}
          </p>
          {isEditing ? (
            <div className="mt-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[36px] max-h-32 resize-none text-sm"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="default" onClick={handleSaveEdit} className="h-7 px-2">
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 px-2">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={`text-foreground whitespace-pre-wrap break-words ${isReply ? "text-xs" : "text-sm"}`}>
              {comment.content}
            </p>
          )}
          {!isEditing && (isOwner || canReport) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-muted-foreground hover:text-primary"
                    title="Edit comment"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(comment.id, hasReplies)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {canReport && (
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="text-muted-foreground hover:text-orange-500"
                  title="Report comment"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            {wasEdited && <span className="ml-1">(edited)</span>}
          </p>
          {user && (
            <button
              onClick={() => onLike(comment.id, comment.isLiked || false)}
              className={`text-xs flex items-center gap-1 transition-colors ${
                comment.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`} />
              {(comment.likesCount || 0) > 0 && <span>{comment.likesCount}</span>}
            </button>
          )}
          {user && !isReply && (
            <button
              onClick={() => onReply(comment.id, comment.profiles?.display_name || "User")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Reply
            </button>
          )}
        </div>
        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply}
                groupId={groupId}
                onReply={onReply} 
                onDelete={onDelete}
                onLike={onLike}
                onEdit={onEdit}
                isReply 
              />
            ))}
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <ReportContentDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        groupId={groupId}
        commentId={comment.id}
        contentType="comment"
      />
    </div>
  );
};

export const GroupPostCommentSection = ({ postId, groupId, onCommentCountChange }: GroupPostCommentSectionProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["group-post-comments", postId],
    queryFn: async () => {
      const { data: commentsData, error } = await supabase
        .from("group_post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const commentIds = commentsData.map(c => c.id);

        // Fetch profiles and likes in parallel
        const [profilesResult, likesCountResult, userLikesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, username")
            .in("user_id", userIds),
          supabase
            .from("group_comment_likes")
            .select("comment_id")
            .in("comment_id", commentIds),
          user
            ? supabase
                .from("group_comment_likes")
                .select("comment_id")
                .in("comment_id", commentIds)
                .eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);
        
        // Count likes per comment
        const likesCountMap = new Map<string, number>();
        likesCountResult.data?.forEach(like => {
          likesCountMap.set(like.comment_id, (likesCountMap.get(like.comment_id) || 0) + 1);
        });

        // Track which comments user has liked
        const userLikedSet = new Set(userLikesResult.data?.map(l => l.comment_id) || []);

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profiles: profileMap.get(comment.user_id),
          likesCount: likesCountMap.get(comment.id) || 0,
          isLiked: userLikedSet.has(comment.id),
        })) as GroupComment[];

        // Organize into parent comments with nested replies
        const parentComments: GroupComment[] = [];
        const replyMap = new Map<string, GroupComment[]>();

        commentsWithProfiles.forEach(comment => {
          if (comment.parent_comment_id) {
            const existing = replyMap.get(comment.parent_comment_id) || [];
            existing.push(comment);
            replyMap.set(comment.parent_comment_id, existing);
          } else {
            parentComments.push(comment);
          }
        });

        // Attach replies to parent comments
        parentComments.forEach(parent => {
          parent.replies = replyMap.get(parent.id) || [];
        });

        return parentComments;
      }

      return [] as GroupComment[];
    },
  });

  // Calculate total comments including replies
  const getTotalCount = () => {
    let count = 0;
    comments.forEach(comment => {
      count += 1 + (comment.replies?.length || 0);
    });
    return count;
  };

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId: string | null }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("group_post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId,
      });

      if (error) throw error;

      // Update comment count on group post
      const currentCount = getTotalCount();
      await supabase
        .from("group_posts")
        .update({ comments_count: currentCount + 1 })
        .eq("id", postId);
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
      onCommentCountChange?.(getTotalCount() + 1);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ commentId, deleteCount }: { commentId: string; deleteCount: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("group_post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      // Update comment count on group post
      const currentCount = getTotalCount();
      const newCount = Math.max(0, currentCount - deleteCount);
      await supabase
        .from("group_posts")
        .update({ comments_count: newCount })
        .eq("id", postId);

      return newCount;
    },
    onSuccess: (newCount) => {
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
      onCommentCountChange?.(newCount);
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("group_post_comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment updated");
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
    },
    onError: () => {
      toast.error("Failed to update comment");
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("group_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("group_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-post-comments", postId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && !addCommentMutation.isPending) {
      addCommentMutation.mutate({ 
        content: newComment.trim(), 
        parentCommentId: replyingTo?.id || null 
      });
    }
  };

  const handleReply = (commentId: string, displayName: string) => {
    setReplyingTo({ id: commentId, displayName });
  };

  const handleDelete = (commentId: string, hasReplies: boolean) => {
    // If comment has replies, they will be cascade deleted, so count them
    const comment = comments.find(c => c.id === commentId);
    const replyCount = comment?.replies?.length || 0;
    const deleteCount = hasReplies ? 1 + replyCount : 1;
    
    deleteCommentMutation.mutate({ commentId, deleteCount });
  };

  const handleEdit = (commentId: string, newContent: string) => {
    editCommentMutation.mutate({ commentId, content: newContent });
  };

  const handleLike = (commentId: string, isLiked: boolean) => {
    likeCommentMutation.mutate({ commentId, isLiked });
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div className="border-t border-border">
      {/* Comments List */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t("feed.noComments", "No comments yet. Be the first!")}
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment}
              groupId={groupId}
              onReply={handleReply}
              onDelete={handleDelete}
              onLike={handleLike}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="h-4 w-4" />
            <span>Replying to <span className="font-medium text-foreground">{replyingTo.displayName}</span></span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="p-4 pt-2 flex gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile?.display_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.displayName}...` : t("feed.writeComment", "Write a comment...")}
              className="min-h-[36px] max-h-20 resize-none text-sm"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="flex-shrink-0"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
