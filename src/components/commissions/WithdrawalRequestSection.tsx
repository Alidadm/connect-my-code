import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payout_method: string;
  payout_email: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

interface WithdrawalRequestSectionProps {
  pendingEarnings: number;
  userId: string;
}

const WithdrawalRequestSection = ({ pendingEarnings, userId }: WithdrawalRequestSectionProps) => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  const minimumWithdrawal = 10; // Minimum $10 to withdraw

  useEffect(() => {
    fetchWithdrawalRequests();
  }, [userId]);

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!payoutEmail.trim()) {
      toast.error("Please enter your PayPal email address");
      return;
    }

    if (pendingEarnings < minimumWithdrawal) {
      toast.error(`Minimum withdrawal amount is $${minimumWithdrawal}`);
      return;
    }

    // Check for pending requests
    const hasPendingRequest = requests.some(r => r.status === "pending" || r.status === "approved");
    if (hasPendingRequest) {
      toast.error("You already have a pending withdrawal request");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: userId,
          amount: pendingEarnings,
          currency: "usd",
          payout_method: "paypal",
          payout_email: payoutEmail.trim(),
          status: "pending"
        });

      if (error) throw error;

      toast.success("Withdrawal request submitted successfully!");
      setShowForm(false);
      setPayoutEmail("");
      fetchWithdrawalRequests();
    } catch (error: any) {
      toast.error("Failed to submit withdrawal request");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
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
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const canWithdraw = pendingEarnings >= minimumWithdrawal && 
    !requests.some(r => r.status === "pending" || r.status === "approved");

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Withdraw Earnings</CardTitle>
              <CardDescription>Request a payout of your pending commissions</CardDescription>
            </div>
          </div>
          {!showForm && canWithdraw && (
            <Button onClick={() => setShowForm(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Request Withdrawal
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Withdrawal Form */}
        {showForm && (
          <div className="p-4 border rounded-lg bg-muted/30 mb-6">
            <h4 className="font-medium mb-4">Request Withdrawal</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <span className="text-muted-foreground">Amount to withdraw:</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(pendingEarnings)}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payoutEmail">PayPal Email Address</Label>
                <Input
                  id="payoutEmail"
                  type="email"
                  placeholder="your-paypal@email.com"
                  value={payoutEmail}
                  onChange={(e) => setPayoutEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address associated with your PayPal account
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={submitting || !payoutEmail.trim()}
                  className="flex-1"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setPayoutEmail("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {!canWithdraw && pendingEarnings < minimumWithdrawal && (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-500/5 border-yellow-500/20 mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="font-medium text-yellow-600">Minimum withdrawal not met</p>
              <p className="text-sm text-muted-foreground">
                You need at least ${minimumWithdrawal} in pending earnings to request a withdrawal. 
                Current balance: {formatCurrency(pendingEarnings)}
              </p>
            </div>
          </div>
        )}

        {requests.some(r => r.status === "pending" || r.status === "approved") && (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-500/5 border-blue-500/20 mb-6">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium text-blue-600">Withdrawal in progress</p>
              <p className="text-sm text-muted-foreground">
                You have a pending withdrawal request. Please wait for it to be processed.
              </p>
            </div>
          </div>
        )}

        {/* Withdrawal History */}
        {requests.length > 0 && (
          <>
            <Separator className="my-4" />
            <h4 className="font-medium mb-4">Withdrawal History</h4>
            <div className="space-y-3">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      request.status === "completed" ? "bg-green-500/10" : 
                      request.status === "rejected" ? "bg-red-500/10" : "bg-yellow-500/10"
                    }`}>
                      {request.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : request.status === "rejected" ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Withdrawal Request</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.created_at)}
                        {request.payout_email && ` • ${request.payout_email}`}
                      </p>
                      {request.admin_notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {request.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">
                      {formatCurrency(request.amount)}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* No requests yet */}
        {!loading && requests.length === 0 && !showForm && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No withdrawal requests yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalRequestSection;
