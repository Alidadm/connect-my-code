import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Flag, 
  Loader2, 
  MessageSquare, 
  FileText, 
  Check, 
  X, 
  Trash2,
  AlertTriangle,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Report {
  id: string;
  reporter_id: string;
  group_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  post_content?: string | null;
  post_author?: {
    display_name: string | null;
    username: string | null;
  };
  comment_content?: string | null;
  comment_author?: {
    display_name: string | null;
    username: string | null;
  };
}

interface ModerationPanelProps {
  groupId: string;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam or misleading",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech or discrimination",
  violence: "Violence or dangerous content",
  inappropriate: "Inappropriate or offensive content",
  other: "Other",
};

export const ModerationPanel = ({ groupId }: ModerationPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "post" | "comment"; id: string; reportId: string } | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["group-reports", groupId, filter],
    queryFn: async () => {
      let query = supabase
        .from("group_content_reports")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.eq("status", "pending");
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch reporter profiles
      const reporterIds = [...new Set(data.map(r => r.reporter_id))];
      const { data: reporterProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", reporterIds);

      // Fetch post details for post reports
      const postIds = data.filter(r => r.post_id).map(r => r.post_id!);
      let postDetails: Record<string, { content: string | null; user_id: string }> = {};
      let postAuthorProfiles: Record<string, { display_name: string | null; username: string | null }> = {};
      
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from("group_posts")
          .select("id, content, user_id")
          .in("id", postIds);
        
        if (posts) {
          posts.forEach(p => { postDetails[p.id] = p; });
          
          const postAuthorIds = [...new Set(posts.map(p => p.user_id))];
          const { data: authorProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, username")
            .in("user_id", postAuthorIds);
          
          if (authorProfiles) {
            authorProfiles.forEach(p => { postAuthorProfiles[p.user_id] = p; });
          }
        }
      }

      // Fetch comment details for comment reports
      const commentIds = data.filter(r => r.comment_id).map(r => r.comment_id!);
      let commentDetails: Record<string, { content: string; user_id: string }> = {};
      let commentAuthorProfiles: Record<string, { display_name: string | null; username: string | null }> = {};
      
      if (commentIds.length > 0) {
        const { data: comments } = await supabase
          .from("group_post_comments")
          .select("id, content, user_id")
          .in("id", commentIds);
        
        if (comments) {
          comments.forEach(c => { commentDetails[c.id] = c; });
          
          const commentAuthorIds = [...new Set(comments.map(c => c.user_id))];
          const { data: authorProfiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, username")
            .in("user_id", commentAuthorIds);
          
          if (authorProfiles) {
            authorProfiles.forEach(p => { commentAuthorProfiles[p.user_id] = p; });
          }
        }
      }

      // Combine all data
      return data.map(report => {
        const postDetail = report.post_id ? postDetails[report.post_id] : null;
        const commentDetail = report.comment_id ? commentDetails[report.comment_id] : null;
        
        return {
          ...report,
          reporter_profile: reporterProfiles?.find(p => p.user_id === report.reporter_id),
          post_content: postDetail?.content,
          post_author: postDetail ? postAuthorProfiles[postDetail.user_id] : null,
          comment_content: commentDetail?.content,
          comment_author: commentDetail ? commentAuthorProfiles[commentDetail.user_id] : null,
        } as Report;
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("group_content_reports")
        .update({ 
          status, 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-reports", groupId] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async ({ type, id, reportId }: { type: "post" | "comment"; id: string; reportId: string }) => {
      if (type === "post") {
        const { error } = await supabase.from("group_posts").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("group_post_comments").delete().eq("id", id);
        if (error) throw error;
      }
      
      // Mark report as resolved
      await supabase
        .from("group_content_reports")
        .update({ 
          status: "resolved_deleted", 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", reportId);
    },
    onSuccess: () => {
      toast.success("Content deleted and report resolved");
      queryClient.invalidateQueries({ queryKey: ["group-reports", groupId] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete content");
    },
  });

  const handleDismiss = (reportId: string) => {
    updateReportMutation.mutate({ reportId, status: "dismissed" });
    toast.success("Report dismissed");
  };

  const handleResolve = (reportId: string) => {
    updateReportMutation.mutate({ reportId, status: "resolved" });
    toast.success("Report marked as resolved");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Resolved</Badge>;
      case "resolved_deleted":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Deleted</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = reports.filter(r => r.status === "pending").length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Content Reports
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and manage reported posts and comments</CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "pending" | "all")}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="all">All Reports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {filter === "pending" ? "No pending reports" : "No reports yet"}
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  {/* Report Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${report.post_id ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
                        {report.post_id ? (
                          <FileText className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {report.post_id ? "Post Report" : "Comment Report"}
                          </span>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-600 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      {REASON_LABELS[report.reason] || report.reason}
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    )}
                  </div>

                  {/* Reported Content */}
                  <div className="border-l-2 border-muted pl-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Reported content by @{report.post_id ? report.post_author?.username : report.comment_author?.username}:
                    </p>
                    <p className="text-sm line-clamp-3">
                      {report.post_id ? report.post_content : report.comment_content}
                    </p>
                  </div>

                  {/* Reporter Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Reported by</span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={report.reporter_profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {report.reporter_profile?.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{report.reporter_profile?.display_name || "Unknown"}</span>
                  </div>

                  {/* Actions */}
                  {report.status === "pending" && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {report.post_id && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/groups/${groupId}/post/${report.post_id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Post
                          </Link>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDismiss(report.id)}
                        disabled={updateReportMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleResolve(report.id)}
                        disabled={updateReportMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setDeleteTarget({
                          type: report.post_id ? "post" : "comment",
                          id: (report.post_id || report.comment_id)!,
                          reportId: report.id
                        })}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Content
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The {deleteTarget?.type} will be permanently deleted and the report will be marked as resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteContentMutation.mutate(deleteTarget)}
            >
              {deleteContentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
