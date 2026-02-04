import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Send, CreditCard, Loader2 } from "lucide-react";
import { useAdOrders } from "@/hooks/useAds";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending_review: { color: "bg-amber-500", icon: Clock, label: "Under Review" },
  quoted: { color: "bg-blue-500", icon: Send, label: "Quote Ready" },
  approved: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
  pending: { color: "bg-gray-500", icon: AlertCircle, label: "Pending" },
};

const paymentStatusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-gray-500", label: "Unpaid" },
  paid: { color: "bg-green-500", label: "Paid" },
  failed: { color: "bg-red-500", label: "Failed" },
  refunded: { color: "bg-blue-500", label: "Refunded" },
};

export const AdOrdersList = () => {
  const { data: orders = [], isLoading, refetch } = useAdOrders();
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayQuote = async (orderId: string, campaignId: string, amount: number, guestEmail?: string | null, guestName?: string | null) => {
    setPayingOrderId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("create-ad-checkout", {
        body: {
          campaignId,
          amount,
          guestEmail: guestEmail || undefined,
          guestName: guestName || undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error("Failed to start payment: " + error.message);
    } finally {
      setPayingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground">
            Your ad orders will appear here after you create a campaign.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => {
        const status = statusConfig[order.status] || statusConfig.pending_review;
        const paymentStatus = paymentStatusConfig[order.payment_status] || paymentStatusConfig.pending;
        const StatusIcon = status.icon;
        const hasQuote = order.status === "quoted" && order.admin_quoted_price;
        const canPay = hasQuote && order.payment_status !== "paid";
        const isExpired = order.quote_expires_at && new Date(order.quote_expires_at) < new Date();

        return (
          <Card key={order.id} className={hasQuote && !isExpired ? "border-primary/50" : ""}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${hasQuote ? "bg-primary/20" : "bg-primary/10"}`}>
                    {hasQuote ? (
                      <DollarSign className="h-5 w-5 text-primary" />
                    ) : (
                      <Receipt className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {order.campaign?.name || "Campaign"}
                      </h3>
                      <Badge className={`${status.color} text-white`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      {order.payment_status === "paid" && (
                        <Badge className="bg-green-500 text-white">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>

                    {order.admin_notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Note:</strong> {order.admin_notes}
                      </div>
                    )}

                    {hasQuote && order.quote_expires_at && (
                      <p className={`text-xs mt-2 ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                        {isExpired 
                          ? "Quote expired on " + format(new Date(order.quote_expires_at), "MMM d, yyyy")
                          : "Quote valid until " + format(new Date(order.quote_expires_at), "MMM d, yyyy")
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {hasQuote ? (
                    <>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Your Quote</div>
                        <div className="text-3xl font-bold text-primary">
                          ${order.admin_quoted_price}
                        </div>
                      </div>
                      {canPay && !isExpired && (
                        <Button 
                          onClick={() => handlePayQuote(
                            order.id, 
                            order.campaign_id, 
                            order.admin_quoted_price!, 
                            order.guest_email, 
                            order.guest_name
                          )}
                          disabled={payingOrderId === order.id}
                          className="gap-2"
                        >
                          {payingOrderId === order.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      )}
                      {isExpired && (
                        <p className="text-xs text-destructive">Contact support for a new quote</p>
                      )}
                    </>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {order.status === "pending_review" 
                          ? "Awaiting price quote" 
                          : order.status === "rejected"
                          ? "Not approved"
                          : ""}
                      </div>
                    </div>
                  )}

                  {order.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed {format(new Date(order.reviewed_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};