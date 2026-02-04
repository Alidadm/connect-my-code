import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { PenPalProfile } from "@/hooks/usePenPals";

interface PenPalComment {
  id: string;
  profile_user_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PenPalProfileCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PenPalProfile;
}

export const PenPalProfileCommentsDialog = ({
  open,
  onOpenChange,
  profile,
}: PenPalProfileCommentsDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<PenPalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const profileName = profile.display_name || profile.username || "User";

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, profile.user_id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("penpal_comments")
        .select("*")
        .eq("profile_user_id", profile.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set(data?.map((c) => c.author_user_id) || [])];
      const { data: authors } = await supabase
        .from("safe_profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", authorIds);

      const authorMap = new Map(authors?.map((a) => [a.user_id, a]) || []);

      const commentsWithAuthors: PenPalComment[] = (data || []).map((c) => ({
        ...c,
        author: authorMap.get(c.author_user_id) || undefined,
      }));

      setComments(commentsWithAuthors);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("penpal_comments").insert({
        profile_user_id: profile.user_id,
        author_user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      toast.success(t("penpal.commentAdded", "Comment added!"));
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error(t("penpal.commentError", "Failed to add comment"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);
    try {
      const { error } = await supabase
        .from("penpal_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success(t("penpal.commentDeleted", "Comment deleted"));
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(t("penpal.deleteError", "Failed to delete comment"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("penpal.commentsOn", "Comments on {{name}}", { name: profileName })}
          </DialogTitle>
          <DialogDescription>
            {t("penpal.leaveComment", "Leave a public comment on this profile")}
          </DialogDescription>
        </DialogHeader>

        {/* New comment input */}
        {user && (
          <div className="flex gap-2 pt-2">
            <Textarea
              placeholder={t("penpal.writeComment", "Write a comment...")}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              maxLength={500}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              size="icon"
              className="self-end"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-[200px]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
              <p>{t("penpal.noComments", "No comments yet. Be the first!")}</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(comment.author?.display_name || comment.author?.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {comment.author?.display_name || comment.author?.username || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {user?.id === comment.author_user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleting === comment.id}
                      >
                        {deleting === comment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
