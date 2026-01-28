import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Search,
  Trash2,
  Eye,
  Reply,
  Archive,
  RefreshCw,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages((data as ContactMessage[]) || []);
      setNewCount((data || []).filter((m) => m.status === "new").length);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("contact-messages-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_messages" },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleView = async (message: ContactMessage) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);

    // Mark as read if new
    if (message.status === "new") {
      try {
        await supabase
          .from("contact_messages")
          .update({ status: "read", updated_at: new Date().toISOString() })
          .eq("id", message.id);
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const handleReplyOpen = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyText(message.admin_reply || "");
    setReplyDialogOpen(true);
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setReplying(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("contact_messages")
        .update({
          admin_reply: replyText.trim(),
          status: "replied",
          replied_at: new Date().toISOString(),
          replied_by: userData.user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMessage.id);

      if (error) throw error;

      toast.success("Reply saved successfully");
      setReplyDialogOpen(false);
      setReplyText("");
      fetchMessages();
    } catch (error) {
      console.error("Error saving reply:", error);
      toast.error("Failed to save reply");
    } finally {
      setReplying(false);
    }
  };

  const handleArchive = async (message: ContactMessage) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", message.id);

      if (error) throw error;
      toast.success("Message archived");
      fetchMessages();
    } catch (error) {
      console.error("Error archiving:", error);
      toast.error("Failed to archive message");
    }
  };

  const handleDeleteOpen = (message: ContactMessage) => {
    setSelectedMessage(message);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", selectedMessage.id);

      if (error) throw error;

      toast.success("Message deleted");
      setDeleteDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500">New</Badge>;
      case "read":
        return <Badge variant="secondary">Read</Badge>;
      case "replied":
        return <Badge className="bg-green-500">Replied</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Messages">
      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{messages.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Messages</p>
                <p className="text-2xl font-bold">{newCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Replied</p>
                <p className="text-2xl font-bold">
                  {messages.filter((m) => m.status === "replied").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Archive className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold">
                  {messages.filter((m) => m.status === "archived").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchMessages}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading messages...
                  </TableCell>
                </TableRow>
              ) : filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No messages found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map((msg) => (
                  <TableRow key={msg.id} className={msg.status === "new" ? "bg-blue-50/50" : ""}>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{msg.name}</p>
                        <p className="text-sm text-muted-foreground">{msg.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate">{msg.subject}</p>
                    </TableCell>
                    <TableCell>
                      {format(new Date(msg.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(msg)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReplyOpen(msg)}
                          title="Reply"
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                        {msg.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchive(msg)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOpen(msg)}
                          title="Delete"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">From</label>
                    <p className="font-medium">{selectedMessage.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{selectedMessage.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <p>{format(new Date(selectedMessage.created_at), "PPpp")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="font-medium">{selectedMessage.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>
                {selectedMessage.admin_reply && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Admin Reply</label>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg whitespace-pre-wrap">
                      {selectedMessage.admin_reply}
                    </div>
                    {selectedMessage.replied_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Replied on {format(new Date(selectedMessage.replied_at), "PPpp")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (selectedMessage) handleReplyOpen(selectedMessage);
              }}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reply to Message</DialogTitle>
              <DialogDescription>
                Replying to: {selectedMessage?.name} ({selectedMessage?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Original Message</label>
                <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
                  <p className="font-medium mb-1">{selectedMessage?.subject}</p>
                  <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Your Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="mt-1 min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReply} disabled={replying || !replyText.trim()}>
                {replying ? "Saving..." : "Save Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Message</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this message from {selectedMessage?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Messages;
