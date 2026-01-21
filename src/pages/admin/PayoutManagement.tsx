import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Mail,
  Zap,
  Loader2,
  History,
  FileText,
  Copy,
  Settings,
  CreditCard,
  Wallet,
  ToggleRight
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
  provider_payout_id: string | null;
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
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [mainTab, setMainTab] = useState<"requests" | "history" | "settings">("requests");
  
  // Action dialog state
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete" | "auto_payout" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [payingOut, setPayingOut] = useState<string | null>(null);
  
  // Settings state
  const [minimumWithdrawal, setMinimumWithdrawal] = useState<number>(25);
  const [editingMinimum, setEditingMinimum] = useState<string>("25");
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState<boolean>(true);
  const [autoPayoutPriority, setAutoPayoutPriority] = useState<"stripe" | "paypal">("stripe");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAutoPayout, setSavingAutoPayout] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);

  useEffect(() => {
    fetchWithdrawalRequests();
    fetchMinimumWithdrawal();
    fetchAutoPayoutSetting();
    fetchAutoPayoutPriority();
  }, []);

  const fetchAutoPayoutSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "auto_payout_enabled")
        .single();

      if (!error && data) {
        const value = data.setting_value === true || data.setting_value === "true";
        setAutoPayoutEnabled(value);
      }
    } catch (error) {
      console.error("Error fetching auto payout setting:", error);
    }
  };

  const toggleAutoPayout = async () => {
    setSavingAutoPayout(true);
    const newValue = !autoPayoutEnabled;
    
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "auto_payout_enabled",
          setting_value: newValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: "setting_key" });

      if (error) throw error;

      setAutoPayoutEnabled(newValue);
      toast.success(`Auto-payout ${newValue ? "enabled" : "disabled"}`);
    } catch (error: any) {
      toast.error("Failed to update setting");
      console.error(error);
    } finally {
      setSavingAutoPayout(false);
    }
  };

  const fetchAutoPayoutPriority = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "auto_payout_priority")
        .single();

      if (!error && data) {
        const value = data.setting_value === "paypal" ? "paypal" : "stripe";
        setAutoPayoutPriority(value);
      }
    } catch (error) {
      console.error("Error fetching auto payout priority:", error);
    }
  };

  const toggleAutoPayoutPriority = async () => {
    setSavingPriority(true);
    const newValue = autoPayoutPriority === "stripe" ? "paypal" : "stripe";
    
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "auto_payout_priority",
          setting_value: newValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: "setting_key" });

      if (error) throw error;

      setAutoPayoutPriority(newValue);
      toast.success(`Auto-payout priority set to ${newValue === "stripe" ? "Stripe first" : "PayPal first"}`);
    } catch (error: any) {
      toast.error("Failed to update priority setting");
      console.error(error);
    } finally {
      setSavingPriority(false);
    }
  };

  const fetchMinimumWithdrawal = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "minimum_withdrawal")
        .single();

      if (!error && data) {
        const value = typeof data.setting_value === 'string' 
          ? parseFloat(data.setting_value) 
          : Number(data.setting_value);
        if (!isNaN(value)) {
          setMinimumWithdrawal(value);
          setEditingMinimum(value.toString());
        }
      }
    } catch (error) {
      console.error("Error fetching minimum withdrawal:", error);
    }
  };

  const saveMinimumWithdrawal = async () => {
    const value = parseFloat(editingMinimum);
    if (isNaN(value) || value < 1) {
      toast.error("Please enter a valid amount (minimum $1)");
      return;
    }

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "minimum_withdrawal",
          setting_value: value.toString(),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: "setting_key" });

      if (error) throw error;

      setMinimumWithdrawal(value);
      toast.success(`Minimum withdrawal updated to $${value}`);
    } catch (error: any) {
      toast.error("Failed to save setting");
      console.error(error);
    } finally {
      setSavingSettings(false);
    }
  };

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

      let notificationStatus: "approved" | "rejected" | "completed" | null = null;

      if (actionType === "approve") {
        updateData.status = "approved";
        notificationStatus = "approved";
      } else if (actionType === "reject") {
        updateData.status = "rejected";
        notificationStatus = "rejected";
      } else if (actionType === "complete") {
        updateData.status = "completed";
        notificationStatus = "completed";
        
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

      // Send email notification
      if (notificationStatus) {
        await sendWithdrawalNotification(
          selectedRequest.user_id,
          notificationStatus,
          selectedRequest.amount,
          selectedRequest.currency,
          adminNotes,
          selectedRequest.payout_email
        );
      }

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

  const sendWithdrawalNotification = async (
    userId: string,
    status: "approved" | "rejected" | "completed" | "processing",
    amount: number,
    currency: string,
    adminNotes?: string,
    payoutEmail?: string | null
  ) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-withdrawal-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            user_id: userId,
            status,
            amount,
            currency,
            admin_notes: adminNotes,
            payout_email: payoutEmail,
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to send notification email");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const handleAutomaticPayout = async (request: WithdrawalRequest) => {
    const isStripePayout = request.payout_method === "stripe";
    
    if (!isStripePayout && !request.payout_email) {
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

      const endpoint = isStripePayout ? "stripe-payout" : "paypal-payout";
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
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

      // Send completion notification
      await sendWithdrawalNotification(
        request.user_id,
        "completed",
        request.amount,
        request.currency,
        undefined,
        request.payout_email
      );

      const successId = isStripePayout ? result.transfer_id : result.payout_batch_id;
      toast.success(`Payout sent successfully! ${isStripePayout ? 'Transfer' : 'Batch'} ID: ${successId}`);
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

  const getPayoutMethodBadge = (method: string) => {
    if (method === "stripe") {
      return <Badge variant="outline" className="text-purple-600 border-purple-300"><CreditCard className="h-3 w-3 mr-1" />Stripe</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600 border-blue-300"><Wallet className="h-3 w-3 mr-1" />PayPal</Badge>;
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
  const completedCount = requests.filter(r => r.status === "completed").length;
  const totalPendingAmount = requests
    .filter(r => r.status === "pending" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalPaidAmount = requests
    .filter(r => r.status === "completed")
    .reduce((sum, r) => sum + r.amount, 0);

  // Get completed payouts with batch IDs for history
  const payoutHistory = requests
    .filter(r => r.status === "completed" && r.provider_payout_id)
    .sort((a, b) => new Date(b.processed_at || b.updated_at).getTime() - new Date(a.processed_at || a.updated_at).getTime());

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Payout Management</h1>
              <p className="text-muted-foreground">Process member withdrawal requests</p>
            </div>
            <Button variant="outline" onClick={fetchWithdrawalRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Main Tabs */}
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "requests" | "history" | "settings")} className="mb-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="requests" className="gap-2">
                <FileText className="h-4 w-4" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mainTab === "requests" && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
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
                        <p className="text-sm text-muted-foreground">Ready to Pay</p>
                        <p className="text-2xl font-bold">{approvedCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Amount</p>
                        <p className="text-xl font-bold text-purple-600">{formatCurrency(totalPendingAmount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaidAmount)}</p>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {request.user_profile?.display_name || "Unknown User"}
                              <span className="text-muted-foreground text-sm ml-2">
                                @{request.user_profile?.username || "unknown"}
                              </span>
                            </p>
                            {getPayoutMethodBadge(request.payout_method)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {request.payout_method === "stripe" 
                              ? "Stripe Connect Account" 
                              : (request.payout_email || "No email provided")}
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
            </>
          )}

          {mainTab === "history" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Payout History
                </CardTitle>
                <CardDescription>
                  {payoutHistory.length} completed payout{payoutHistory.length !== 1 ? "s" : ""} with PayPal batch IDs
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
                ) : payoutHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No payout history</h3>
                    <p className="text-muted-foreground text-sm">
                      Completed payouts with PayPal batch IDs will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payoutHistory.map((payout) => (
                      <div 
                        key={payout.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                            {payout.user_profile?.avatar_url ? (
                              <img 
                                src={payout.user_profile.avatar_url} 
                                alt="" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {payout.user_profile?.display_name || "Unknown User"}
                              <span className="text-muted-foreground text-sm ml-2">
                                @{payout.user_profile?.username || "unknown"}
                              </span>
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {payout.payout_email || "No email provided"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Paid: {formatDate(payout.processed_at || payout.updated_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(payout.amount)}
                            </p>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                          
                          {payout.provider_payout_id && (
                            <div className="flex flex-col gap-1">
                              <p className="text-xs text-muted-foreground">PayPal Batch ID:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {payout.provider_payout_id.slice(0, 20)}...
                                </code>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(payout.provider_payout_id || "")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mainTab === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Payout Settings
                </CardTitle>
                <CardDescription>
                  Configure withdrawal and payout settings for the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto Payout Toggle */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ToggleRight className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Automatic Payouts</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When enabled, commissions are automatically paid to members with connected Stripe accounts
                        immediately after each subscription payment is processed.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {savingAutoPayout && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={autoPayoutEnabled}
                        onCheckedChange={toggleAutoPayout}
                        disabled={savingAutoPayout}
                      />
                    </div>
                  </div>
                  <div className={`mt-3 p-3 rounded-lg ${autoPayoutEnabled ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                    <p className="text-sm">
                      <span className="font-medium">Status:</span>{" "}
                      {autoPayoutEnabled ? (
                        <span className="text-green-600 font-semibold">
                          Auto-payout is active — Members receive instant payouts
                        </span>
                      ) : (
                        <span className="text-yellow-600 font-semibold">
                          Auto-payout is paused — All payouts require manual processing
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Auto-Payout Priority */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Auto-Payout Priority
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Choose which payout method to try first when both Stripe Connect and PayPal are available.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={autoPayoutPriority === "stripe" ? "default" : "outline"}
                        size="sm"
                        onClick={() => autoPayoutPriority !== "stripe" && toggleAutoPayoutPriority()}
                        disabled={savingPriority || autoPayoutPriority === "stripe"}
                        className="gap-1"
                      >
                        <CreditCard className="h-3 w-3" />
                        Stripe First
                      </Button>
                      <Button
                        variant={autoPayoutPriority === "paypal" ? "default" : "outline"}
                        size="sm"
                        onClick={() => autoPayoutPriority !== "paypal" && toggleAutoPayoutPriority()}
                        disabled={savingPriority || autoPayoutPriority === "paypal"}
                        className="gap-1"
                      >
                        <Wallet className="h-3 w-3" />
                        PayPal First
                      </Button>
                    </div>
                  </div>
                  <div className={`mt-3 p-3 rounded-lg ${autoPayoutPriority === "stripe" ? "bg-purple-500/10" : "bg-blue-500/10"}`}>
                    <p className="text-sm">
                      <span className="font-medium">Current priority:</span>{" "}
                      {autoPayoutPriority === "stripe" ? (
                        <span className="text-purple-600 font-semibold">
                          Stripe Connect → PayPal (fallback)
                        </span>
                      ) : (
                        <span className="text-blue-600 font-semibold">
                          PayPal → Stripe Connect (fallback)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Minimum Withdrawal */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">Minimum Withdrawal Amount</h4>
                      <p className="text-sm text-muted-foreground">
                        Users must have at least this amount in pending earnings to request a withdrawal.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={editingMinimum}
                          onChange={(e) => setEditingMinimum(e.target.value)}
                          className="w-24 pl-8"
                        />
                      </div>
                      <Button 
                        onClick={saveMinimumWithdrawal}
                        disabled={savingSettings || editingMinimum === minimumWithdrawal.toString()}
                        size="sm"
                      >
                        {savingSettings ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Current setting:</span>{" "}
                      <span className="text-green-600 font-semibold">${minimumWithdrawal}</span> minimum to withdraw
                    </p>
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-700 dark:text-blue-400">About Withdrawal Thresholds</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Setting a minimum withdrawal amount helps reduce transaction fees and administrative overhead 
                        from processing many small payouts. The recommended range is $10-$50.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
    </AdminLayout>
  );
};

export default PayoutManagement;
