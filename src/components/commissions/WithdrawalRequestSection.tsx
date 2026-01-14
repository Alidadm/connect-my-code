import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2
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

interface StripeConnectStatus {
  connected: boolean;
  status: string;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

interface WithdrawalRequestSectionProps {
  pendingEarnings: number;
  userId: string;
}

const WithdrawalRequestSection = ({ pendingEarnings, userId }: WithdrawalRequestSectionProps) => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"paypal" | "stripe">("paypal");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(25);
  
  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    fetchWithdrawalRequests();
    fetchMinimumWithdrawal();
    checkStripeConnectStatus();
  }, [userId]);

  const checkStripeConnectStatus = async () => {
    setCheckingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        setStripeStatus(result);
      }
    } catch (error) {
      console.error("Error checking Stripe Connect status:", error);
    } finally {
      setCheckingStripe(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to connect Stripe");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ origin: window.location.origin }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to start Stripe onboarding");
      }

      if (result.status === "complete") {
        toast.success("Your Stripe account is already connected!");
        await checkStripeConnectStatus();
      } else if (result.url) {
        window.open(result.url, "_blank");
        toast.info("Complete your Stripe account setup in the new tab");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Stripe account");
      console.error(error);
    } finally {
      setConnectingStripe(false);
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
        }
      }
    } catch (error) {
      console.error("Error fetching minimum withdrawal:", error);
    }
  };

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
    // Validate based on payout method
    if (payoutMethod === "paypal" && !payoutEmail.trim()) {
      toast.error("Please enter your PayPal email address");
      return;
    }

    if (payoutMethod === "stripe" && (!stripeStatus?.connected || stripeStatus.status !== "active")) {
      toast.error("Please connect your Stripe account first");
      return;
    }

    if (pendingEarnings < minimumWithdrawal) {
      toast.error(`Minimum withdrawal amount is $${minimumWithdrawal}`);
      return;
    }

    const hasPendingRequest = requests.some(r => r.status === "pending" || r.status === "approved");
    if (hasPendingRequest) {
      toast.error("You already have a pending withdrawal request");
      return;
    }

    setSubmitting(true);
    try {
      const insertData: any = {
        user_id: userId,
        amount: pendingEarnings,
        currency: "usd",
        payout_method: payoutMethod,
        status: "pending"
      };

      if (payoutMethod === "paypal") {
        insertData.payout_email = payoutEmail.trim();
      }

      const { error } = await supabase
        .from("withdrawal_requests")
        .insert(insertData);

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

  const isStripeReady = stripeStatus?.connected && stripeStatus.status === "active";

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

              {/* Payout Method Selection */}
              <div className="space-y-3">
                <Label>Choose Payout Method</Label>
                <RadioGroup 
                  value={payoutMethod} 
                  onValueChange={(value) => setPayoutMethod(value as "paypal" | "stripe")}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      PayPal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      Stripe
                      {isStripeReady && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* PayPal Email Input */}
              {payoutMethod === "paypal" && (
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
              )}

              {/* Stripe Connect Status */}
              {payoutMethod === "stripe" && (
                <div className="space-y-3">
                  {checkingStripe ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Checking Stripe account status...</span>
                    </div>
                  ) : isStripeReady ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">Stripe Account Connected</p>
                        <p className="text-xs text-green-600">Ready to receive payouts directly to your bank</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* What to Expect Section */}
                      <div className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
                        <h5 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          What to Expect
                        </h5>
                        <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                          <li>You'll be redirected to <strong>Stripe's secure page</strong> (not our site)</li>
                          <li>Enter your personal info, bank account, and verify identity</li>
                          <li>This is a one-time setup — takes about 5-10 minutes</li>
                          <li>Once connected, commissions are deposited <strong>directly to your bank</strong></li>
                          <li>Funds typically arrive in 2-3 business days</li>
                        </ul>
                      </div>

                      {/* Connect Button */}
                      <div className="p-4 border rounded-lg bg-purple-500/5 border-purple-500/20">
                        <div className="flex items-start gap-3">
                          <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-purple-700">Ready to Connect?</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              Click below to securely link your bank account through Stripe
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={handleConnectStripe}
                              disabled={connectingStripe}
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              {connectingStripe ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Connect Stripe Account
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={
                    submitting || 
                    (payoutMethod === "paypal" && !payoutEmail.trim()) ||
                    (payoutMethod === "stripe" && !isStripeReady)
                  }
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Withdrawal Request</p>
                        {getPayoutMethodBadge(request.payout_method)}
                      </div>
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
