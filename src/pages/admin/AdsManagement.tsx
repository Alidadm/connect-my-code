import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Megaphone, CheckCircle, XCircle, Clock, Eye, 
  Search, RefreshCw, DollarSign, User, Mail, Send, CreditCard
} from "lucide-react";
import { useAdOrders, useUpdateOrderStatus, useUpdateCampaignStatus, AdOrder } from "@/hooks/useAds";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending_review: { color: "bg-amber-500", icon: Clock, label: "Pending Review" },
  quoted: { color: "bg-blue-500", icon: Send, label: "Quote Sent" },
  approved: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
};

const AdsManagement = () => {
  const { data: orders = [], isLoading, refetch } = useAdOrders(true);
  const updateOrderStatus = useUpdateOrderStatus();
  const updateCampaignStatus = useUpdateCampaignStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState<AdOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [quotedPrice, setQuotedPrice] = useState<string>("");
  const [actionType, setActionType] = useState<"quote" | "approve" | "reject" | null>(null);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.campaign?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guest_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "pending") {
      return matchesSearch && order.status === "pending_review";
    } else if (activeTab === "quoted") {
      return matchesSearch && order.status === "quoted";
    } else if (activeTab === "approved") {
      return matchesSearch && order.status === "approved";
    } else if (activeTab === "rejected") {
      return matchesSearch && order.status === "rejected";
    }
    return matchesSearch;
  });

  const pendingCount = orders.filter(o => o.status === "pending_review").length;
  const quotedCount = orders.filter(o => o.status === "quoted").length;
  const approvedCount = orders.filter(o => o.status === "approved").length;
  const rejectedCount = orders.filter(o => o.status === "rejected").length;

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;

    try {
      if (actionType === "quote") {
        const price = parseFloat(quotedPrice);
        if (isNaN(price) || price <= 0) {
          toast.error("Please enter a valid price");
          return;
        }

        await updateOrderStatus.mutateAsync({
          id: selectedOrder.id,
          status: "quoted",
          adminNotes,
          quotedPrice: price,
        });

        toast.success("Price quote sent to customer!");
      } else {
        await updateOrderStatus.mutateAsync({
          id: selectedOrder.id,
          status: actionType === "approve" ? "approved" : "rejected",
          adminNotes,
        });

        // Update campaign status
        if (selectedOrder.campaign_id) {
          await updateCampaignStatus.mutateAsync({
            id: selectedOrder.campaign_id,
            status: actionType === "approve" ? "active" : "rejected",
          });
        }

        toast.success(`Order ${actionType === "approve" ? "approved" : "rejected"} successfully`);
      }

      setSelectedOrder(null);
      setAdminNotes("");
      setQuotedPrice("");
      setActionType(null);
    } catch (error: any) {
      toast.error("Failed to update order: " + error.message);
    }
  };

  const openActionDialog = (order: AdOrder, action: "quote" | "approve" | "reject") => {
    setSelectedOrder(order);
    setActionType(action);
    setAdminNotes("");
    setQuotedPrice(order.admin_quoted_price?.toString() || "");
  };

  return (
    <AdminLayout title="Ads Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ads Management</h1>
              <p className="text-slate-400">Review ads and set custom pricing</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Quotes Sent</p>
                  <p className="text-3xl font-bold text-blue-500">{quotedCount}</p>
                </div>
                <Send className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Approved</p>
                  <p className="text-3xl font-bold text-green-500">{approvedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Rejected</p>
                  <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by campaign name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="pending" className="data-[state=active]:bg-slate-700">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="quoted" className="data-[state=active]:bg-slate-700">
              Quoted ({quotedCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-slate-700">
              Approved ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-slate-700">
              Rejected ({rejectedCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">
              All ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
                      <div className="h-4 bg-slate-700 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700 border-dashed">
                <CardContent className="p-12 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No orders found</h3>
                  <p className="text-slate-400">
                    {activeTab === "pending" 
                      ? "No pending orders to review"
                      : "No orders match your search"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending_review;
                  const StatusIcon = status.icon;

                  return (
                    <Card key={order.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white text-lg">
                                {order.campaign?.name || "Untitled Campaign"}
                              </h3>
                              <Badge className={`${status.color} text-white`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              {order.payment_status === "paid" && (
                                <Badge className="bg-green-600 text-white">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Paid
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {order.admin_quoted_price ? (
                                <div className="flex items-center gap-2 text-slate-300">
                                  <DollarSign className="h-4 w-4 text-green-500" />
                                  <span className="font-semibold text-green-400">
                                    ${order.admin_quoted_price}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-400">
                                  <DollarSign className="h-4 w-4" />
                                  <span>No price set</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-slate-300">
                                <User className="h-4 w-4 text-slate-500" />
                                <span>{order.guest_name || "Member"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                <Mail className="h-4 w-4 text-slate-500" />
                                <span className="truncate">{order.guest_email || "—"}</span>
                              </div>
                              <div className="text-slate-400">
                                {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                              </div>
                            </div>

                            {order.admin_notes && (
                              <div className="mt-3 p-2 bg-slate-700/50 rounded text-sm text-slate-300">
                                <strong>Notes:</strong> {order.admin_notes}
                              </div>
                            )}

                            {order.quote_expires_at && order.status === "quoted" && (
                              <div className="mt-2 text-xs text-slate-400">
                                Quote expires: {format(new Date(order.quote_expires_at), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {order.status === "pending_review" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => openActionDialog(order, "quote")}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Set Price
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                                  onClick={() => openActionDialog(order, "reject")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {order.status === "quoted" && order.payment_status === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-500 hover:bg-green-500/10"
                                onClick={() => openActionDialog(order, "approve")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {order.status === "quoted" && order.payment_status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                                onClick={() => openActionDialog(order, "quote")}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Update Price
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={!!selectedOrder && !!actionType} onOpenChange={() => {
          setSelectedOrder(null);
          setActionType(null);
        }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {actionType === "quote" 
                  ? "Set Price Quote" 
                  : actionType === "approve" 
                  ? "Approve Order" 
                  : "Reject Order"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {actionType === "quote" 
                  ? "Set a custom price for this ad campaign based on the creative, targeting, and placement."
                  : actionType === "approve"
                  ? "This will activate the campaign and start showing ads."
                  : "This will reject the campaign."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Campaign</p>
                <p className="font-medium">{selectedOrder?.campaign?.name}</p>
              </div>

              {actionType === "quote" && (
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-white">Price (USD) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                      placeholder="Enter price..."
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Customer will receive this quote and can pay via Stripe.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-white">Admin Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={actionType === "reject" 
                    ? "Reason for rejection..."
                    : actionType === "quote"
                    ? "Notes about pricing decision..."
                    : "Any notes for this approval..."}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => {
                setSelectedOrder(null);
                setActionType(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                className={
                  actionType === "quote" 
                    ? "bg-blue-600 hover:bg-blue-700"
                    : actionType === "approve" 
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
                disabled={updateOrderStatus.isPending || (actionType === "quote" && !quotedPrice)}
              >
                {actionType === "quote" 
                  ? "Send Quote" 
                  : actionType === "approve" 
                  ? "Approve Order" 
                  : "Reject Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdsManagement;