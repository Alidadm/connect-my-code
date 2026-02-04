import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAdOrders } from "@/hooks/useAds";
import { format } from "date-fns";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending_review: { color: "bg-amber-500", icon: Clock, label: "Pending Review" },
  approved: { color: "bg-green-500", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
  pending: { color: "bg-gray-500", icon: AlertCircle, label: "Pending Payment" },
};

const paymentStatusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-gray-500", label: "Pending" },
  paid: { color: "bg-green-500", label: "Paid" },
  failed: { color: "bg-red-500", label: "Failed" },
  refunded: { color: "bg-blue-500", label: "Refunded" },
};

export const AdOrdersList = () => {
  const { data: orders = [], isLoading } = useAdOrders();

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

        return (
          <Card key={order.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {order.campaign?.name || "Campaign"}
                      </h3>
                      <Badge className={`${status.color} text-white`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className={paymentStatus.color.replace("bg-", "text-")}>
                        {paymentStatus.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order #{order.id.slice(0, 8)} • ${order.amount} {order.currency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {order.admin_notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Admin Note:</strong> {order.admin_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold">${order.amount}</div>
                  {order.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed {format(new Date(order.reviewed_at), "MMM d")}
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
