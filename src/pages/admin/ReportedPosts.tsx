import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  Flag, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye,
  AlertTriangle,
  Clock,
  User,
  FileText
} from "lucide-react";

interface PostReport {
  id: string;
  user_id: string;
  post_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  post?: {
    id: string;
    content: string | null;
    media_urls: string[] | null;
    user_id: string;
    created_at: string;
  } | null;
  reporter?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
  post_author?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

const reasonLabels: Record<string, string> = {
  spam: "Spam or misleading",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech",
  violence: "Violence or dangerous content",
  nudity: "Nudity or sexual content",
  false_info: "False information",
  intellectual_property: "Intellectual property violation",
  other: "Other",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  dismissed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const ReportedPosts = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<PostReport | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<PostReport | null>(null);

  // Fetch reports with related data
  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-post-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("post_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: reportsData, error } = await query;
      if (error) throw error;

      // Fetch related data for each report
      const enrichedReports = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Fetch post
          const { data: post } = await supabase
            .from("posts")
            .select("id, content, media_urls, user_id, created_at")
            .eq("id", report.post_id)
            .maybeSingle();

          // Fetch reporter profile
          const { data: reporter } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, username")
            .eq("user_id", report.user_id)
            .maybeSingle();

          // Fetch post author profile if post exists
          let postAuthor = null;
          if (post) {
            const { data: author } = await supabase
              .from("profiles")
              .select("display_name, avatar_url, username")
              .eq("user_id", post.user_id)
              .maybeSingle();
            postAuthor = author;
          }

          return {
            ...report,
            post,
            reporter,
            post_author: postAuthor,
          };
        })
      );

      return enrichedReports as PostReport[];
    },
  });

  // Update report status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("post_reports")
        .update({ 
          status, 
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-reports"] });
      toast.success("Report status updated");
      setSelectedReport(null);
    },
    onError: () => {
      toast.error("Failed to update report status");
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Delete related data first
      await supabase.from("post_likes").delete().eq("post_id", postId);
      await supabase.from("post_comments").delete().eq("post_id", postId);
      await supabase.from("post_tags").delete().eq("post_id", postId);
      await supabase.from("post_topics").delete().eq("post_id", postId);
      await supabase.from("post_visibility_lists").delete().eq("post_id", postId);
      await supabase.from("bookmarks").delete().eq("post_id", postId);
      await supabase.from("hidden_posts").delete().eq("post_id", postId);
      await supabase.from("post_preferences").delete().eq("post_id", postId);
      
      // Delete the post (this will cascade delete reports)
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-post-reports"] });
      toast.success("Post deleted successfully");
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      setSelectedReport(null);
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  const handleResolve = (report: PostReport) => {
    updateStatusMutation.mutate({ reportId: report.id, status: "resolved" });
  };

  const handleDismiss = (report: PostReport) => {
    updateStatusMutation.mutate({ reportId: report.id, status: "dismissed" });
  };

  const handleDeletePost = (report: PostReport) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePost = () => {
    if (reportToDelete?.post_id) {
      deletePostMutation.mutate(reportToDelete.post_id);
    }
  };

  const pendingCount = reports?.filter(r => r.status === "pending").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Flag className="h-6 w-6 text-red-400" />
              Reported Posts
            </h1>
            <p className="text-slate-400 mt-1">
              Review and manage user-reported content
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 self-start">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {pendingCount} pending review
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Filter by status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports?.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No reports found
              </h3>
              <p className="text-slate-400">
                {statusFilter === "all" 
                  ? "There are no reported posts at this time."
                  : `No ${statusFilter} reports found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports?.map((report) => (
              <Card key={report.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Report Info */}
                    <div className="flex-1 space-y-4">
                      {/* Status & Reason */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusColors[report.status]}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {reasonLabels[report.reason] || report.reason}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Reporter */}
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-400">Reported by:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={report.reporter?.avatar_url || ""} />
                            <AvatarFallback className="text-xs bg-slate-600">
                              {report.reporter?.display_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-white">
                            {report.reporter?.display_name || report.reporter?.username || "Unknown"}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {report.description && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-sm text-slate-300">{report.description}</p>
                        </div>
                      )}

                      {/* Post Preview */}
                      {report.post ? (
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-xs text-slate-500">Reported Post</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={report.post_author?.avatar_url || ""} />
                              <AvatarFallback className="text-xs bg-slate-600">
                                {report.post_author?.display_name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-white">
                              {report.post_author?.display_name || "Unknown"}
                            </span>
                            <span className="text-xs text-slate-500">
                              @{report.post_author?.username || "unknown"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 line-clamp-3">
                            {report.post.content || "(No text content)"}
                          </p>
                          {report.post.media_urls && report.post.media_urls.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {report.post.media_urls.slice(0, 3).map((url, idx) => (
                                <img 
                                  key={idx}
                                  src={url} 
                                  alt="" 
                                  className="h-16 w-16 object-cover rounded"
                                />
                              ))}
                              {report.post.media_urls.length > 3 && (
                                <div className="h-16 w-16 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-sm">
                                  +{report.post.media_urls.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 text-center">
                          <p className="text-sm text-slate-500">Post has been deleted</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 hover:bg-slate-700"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-600 text-green-400 hover:bg-green-600/10"
                            onClick={() => handleResolve(report)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 hover:bg-slate-700"
                            onClick={() => handleDismiss(report)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                          {report.post && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600/10"
                              onClick={() => handleDeletePost(report)}
                              disabled={deletePostMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete Post
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Report Details</DialogTitle>
            <DialogDescription>
              Full details of the reported post
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <Badge className={statusColors[selectedReport.status]}>
                    {selectedReport.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Reason</label>
                  <p className="text-sm text-white">
                    {reasonLabels[selectedReport.reason] || selectedReport.reason}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Reported</label>
                  <p className="text-sm text-white">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedReport.reviewed_at && (
                  <div>
                    <label className="text-xs text-slate-500">Reviewed</label>
                    <p className="text-sm text-white">
                      {new Date(selectedReport.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedReport.description && (
                <div>
                  <label className="text-xs text-slate-500">Additional Details</label>
                  <p className="text-sm text-white mt-1 bg-slate-700/50 p-3 rounded">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {selectedReport.post && (
                <div>
                  <label className="text-xs text-slate-500">Post Content</label>
                  <div className="mt-1 bg-slate-900/50 p-4 rounded border border-slate-700">
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {selectedReport.post.content || "(No text content)"}
                    </p>
                    {selectedReport.post.media_urls && selectedReport.post.media_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedReport.post.media_urls.map((url, idx) => (
                          <img 
                            key={idx}
                            src={url} 
                            alt="" 
                            className="h-24 w-24 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedReport?.status === "pending" && selectedReport?.post && (
              <Button
                variant="destructive"
                onClick={() => handleDeletePost(selectedReport)}
                disabled={deletePostMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post and all associated data (likes, comments, etc.) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeletePost}
              disabled={deletePostMutation.isPending}
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default ReportedPosts;
