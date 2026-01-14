import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Reply, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface GroupComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  replies?: GroupComment[];
}

interface GroupPostCommentSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

interface CommentItemProps {
  comment: GroupComment;
  onReply: (commentId: string, displayName: string) => void;
  isReply?: boolean;
}

const CommentItem = ({ comment, onReply, isReply = false }: CommentItemProps) => {
  const { user } = useAuth();
  
  return (
    <div className={`flex gap-2 ${isReply ? "ml-10" : ""}`}>
      <Avatar className={`flex-shrink-0 ${isReply ? "h-6 w-6" : "h-8 w-8"}`}>
        <AvatarImage src={comment.profiles?.avatar_url || ""} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {comment.profiles?.display_name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-secondary rounded-lg px-3 py-2">
          <p className={`font-medium text-foreground ${isReply ? "text-xs" : "text-sm"}`}>
            {comment.profiles?.display_name || "Unknown User"}
          </p>
          <p className={`text-foreground whitespace-pre-wrap break-words ${isReply ? "text-xs" : "text-sm"}`}>
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </p>
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
              <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const GroupPostCommentSection = ({ postId, onCommentCountChange }: GroupPostCommentSectionProps) => {
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

      // Fetch profiles for comments
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profiles: profileMap.get(comment.user_id)
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
              onReply={handleReply}
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
