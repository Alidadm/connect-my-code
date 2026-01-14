import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Mail,
  Zap,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payout_method: string;
  payout_email: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const PayoutManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Action dialog state
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete" | "auto_payout" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [payingOut, setPayingOut] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    setLoading(true);
    try {
      // Fetch withdrawal requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch user profiles for each request
      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set(requestsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const enrichedRequests = requestsData.map(request => ({
          ...request,
          user_profile: profilesMap.get(request.user_id)
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      toast.error("Failed to fetch withdrawal requests");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const updateData: any = {
        admin_notes: adminNotes || null,
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (actionType === "approve") {
        updateData.status = "approved";
      } else if (actionType === "reject") {
        updateData.status = "rejected";
      } else if (actionType === "complete") {
        updateData.status = "completed";
        
        // Update the commissions to "paid" status for this user
        const { error: commissionsError } = await supabase
          .from("commissions")
          .update({ 
            status: "paid", 
            paid_at: new Date().toISOString() 
          })
          .eq("referrer_id", selectedRequest.user_id)
          .eq("status", "pending");

        if (commissionsError) {
          console.error("Error updating commissions:", commissionsError);
        }
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success(`Withdrawal request ${actionType === "complete" ? "completed" : actionType + "d"} successfully!`);
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes("");
      fetchWithdrawalRequests();
    } catch (error: any) {
      toast.error("Failed to process withdrawal request");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAutomaticPayout = async (request: WithdrawalRequest) => {
    if (!request.payout_email) {
      toast.error("No PayPal email provided for this request");
      return;
    }

    setPayingOut(request.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-payout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ withdrawal_request_id: request.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payout failed");
      }

      toast.success(`Payout sent successfully! Batch ID: ${result.payout_batch_id}`);
      fetchWithdrawalRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to process automatic payout");
      console.error("Payout error:", error);
    } finally {
      setPayingOut(null);
    }
  };

  const openPayPalPayout = (email: string, amount: number) => {
    // Open PayPal send money page
    const paypalUrl = `https://www.paypal.com/myaccount/transfer/homepage/pay`;
    window.open(paypalUrl, "_blank");
    toast.info(`Send ${formatCurrency(amount)} to ${email} via PayPal`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "processing":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredRequests = requests.filter(request => {
    const matchesTab = activeTab === "all" || request.status === activeTab;
    const matchesSearch = !searchQuery || 
      request.user_profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.payout_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const totalPendingAmount = requests
    .filter(r => r.status === "pending" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/adminindex")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Payout Management</h1>
              <p className="text-muted-foreground">Process member withdrawal requests</p>
            </div>
            <Button variant="outline" onClick={fetchWithdrawalRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved (Ready to Pay)</p>
                    <p className="text-2xl font-bold">{approvedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pending Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPendingAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                  <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No withdrawal requests</h3>
                  <p className="text-muted-foreground text-sm">
                    {activeTab === "all" 
                      ? "No withdrawal requests have been made yet."
                      : `No ${activeTab} requests found.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {request.user_profile?.avatar_url ? (
                            <img 
                              src={request.user_profile.avatar_url} 
                              alt="" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <DollarSign className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {request.user_profile?.display_name || "Unknown User"}
                            <span className="text-muted-foreground text-sm ml-2">
                              @{request.user_profile?.username || "unknown"}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {request.payout_email || "No email provided"}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested: {formatDate(request.created_at)}
                            {request.processed_at && ` • Processed: ${formatDate(request.processed_at)}`}
                          </p>
                          {request.admin_notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Note: {request.admin_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(request.amount)}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="flex gap-2">
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType("approve");
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType("reject");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === "approved" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                onClick={() => handleAutomaticPayout(request)}
                                disabled={payingOut === request.id}
                              >
                                {payingOut === request.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Zap className="h-4 w-4 mr-1" />
                                )}
                                {payingOut === request.id ? "Sending..." : "Auto Pay"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPayPalPayout(request.payout_email || "", request.amount)}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Manual
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType("complete");
                                }}
                              >
                                Mark Done
                              </Button>
                            </>
                          )}
                          {request.status === "processing" && (
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing Payout...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => {
          setActionType(null);
          setSelectedRequest(null);
          setAdminNotes("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" && "Approve Withdrawal Request"}
                {actionType === "reject" && "Reject Withdrawal Request"}
                {actionType === "complete" && "Mark Payout as Complete"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve" && "Approve this request to proceed with payment."}
                {actionType === "reject" && "Reject this withdrawal request with an explanation."}
                {actionType === "complete" && "Confirm that you've sent the payment via PayPal."}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-medium">{selectedRequest.user_profile?.display_name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">PayPal Email:</span>
                    <span className="font-medium">{selectedRequest.payout_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-green-600">{formatCurrency(selectedRequest.amount)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Admin Notes {actionType === "reject" && "(required)"}
                  </label>
                  <Textarea
                    placeholder={
                      actionType === "reject" 
                        ? "Please provide a reason for rejection..."
                        : "Optional notes..."
                    }
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setActionType(null);
                  setSelectedRequest(null);
                  setAdminNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === "reject" && !adminNotes.trim())}
                variant={actionType === "reject" ? "destructive" : "default"}
                className={actionType === "complete" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {processing ? "Processing..." : 
                  actionType === "approve" ? "Approve" :
                  actionType === "reject" ? "Reject" :
                  "Mark Complete"
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminRouteGuard>
  );
};

export default PayoutManagement;
