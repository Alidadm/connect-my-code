import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import WithdrawalRequestSection from "@/components/commissions/WithdrawalRequestSection";
import ReferralNetworkSection from "@/components/commissions/ReferralNetworkSection";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  CheckCircle,
  TrendingUp,
  Users,
  Wallet,
  Mail,
  Copy,
  Send,
  AlertCircle,
  CreditCard,
  Eye,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Commission {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  referred_user_id: string;
  payment_provider: string | null;
}

const Commissions = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payout setup status
  const [payoutStatus, setPayoutStatus] = useState<{
    hasStripe: boolean;
    hasPaypal: boolean;
    isLoading: boolean;
  }>({ hasStripe: false, hasPaypal: false, isLoading: true });
  
  // Default email template
  const defaultEmailSubject = "Build Your Monthly Income with DolphySN";
  const defaultEmailMessage = `Hi everyone,

DolphySN.com is a new social network built for people who want to connect, grow, and earn real monthly income at the same time.

When you join through my link below, your membership is only $9.99 per month. After you sign up, you can invite anyone — friends, followers, or even people you've never met.

For every person who subscribes through your link, you earn $5 every month as long as they stay active.

Example:
If 20 people join under you, that's $100 every month (20 × $5).
As your downline grows, your monthly income grows too — from both existing members and new members.

Start building your network and your income today.
Join here: {{referral_link}}

See you inside DolphySN.`;

  // Email form state - load from localStorage or use defaults
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState(() => {
    return localStorage.getItem("referral_email_subject") || defaultEmailSubject;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [emailMessage, setEmailMessage] = useState(() => {
    return localStorage.getItem("referral_email_message") || defaultEmailMessage;
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Save to localStorage when subject or message changes
  useEffect(() => {
    localStorage.setItem("referral_email_subject", emailSubject);
  }, [emailSubject]);

  useEffect(() => {
    localStorage.setItem("referral_email_message", emailMessage);
  }, [emailMessage]);

  // Get the referral URL
  const baseUrl = window.location.origin;
  const referralUrl = profile?.username ? `${baseUrl}/${profile.username}` : "";

  const handleCopyUrl = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied to clipboard!");
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTo)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setSendingEmail(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Please log in to send invitations");
        return;
      }

      // Replace {{referral_link}} placeholder with actual referral URL
      const processedMessage = emailMessage.replace(/\{\{referral_link\}\}/g, referralUrl);

      const response = await supabase.functions.invoke("send-referral-invite", {
        body: {
          recipientEmail: emailTo,
          subject: emailSubject,
          message: processedMessage,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation");
      }

      toast.success("Invitation email sent successfully!");
      
      // Clear the form
      setEmailTo("");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCancelEmail = () => {
    setEmailTo("");
    setEmailSubject(defaultEmailSubject);
    setEmailMessage(defaultEmailMessage);
    // Clear localStorage to reset to defaults
    localStorage.removeItem("referral_email_subject");
    localStorage.removeItem("referral_email_message");
  };

  const handleResetToDefault = () => {
    setEmailSubject(defaultEmailSubject);
    setEmailMessage(defaultEmailMessage);
    // Clear localStorage to reset to defaults
    localStorage.removeItem("referral_email_subject");
    localStorage.removeItem("referral_email_message");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      fetchCommissions();
      fetchPayoutStatus();
    }
  }, [user, authLoading, navigate]);

  const fetchPayoutStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check private profile for PayPal email
      const profileResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-my-private-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      const profileData = await profileResponse.json();
      const hasPaypal = !!profileData?.paypal_payout_email;

      // Check Stripe Connect status
      const stripeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      const stripeData = await stripeResponse.json();
      const hasStripe = stripeData?.connected && stripeData?.status === "active";

      setPayoutStatus({
        hasStripe,
        hasPaypal,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching payout status:", error);
      setPayoutStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      toast.error("Failed to load commissions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingEarnings = commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
  const paidEarnings = commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const totalReferrals = commissions.length;
  
  // This month's signups (commissions created this month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthSignups = commissions.filter(c => new Date(c.created_at) >= startOfMonth).length;
  
  // Total subscription value (each referral = $9.99/month subscription)
  const subscriptionRate = 9.99;
  const totalSubscriptionValue = totalReferrals * subscriptionRate;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
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

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const showPayoutReminder = !payoutStatus.isLoading && (!payoutStatus.hasStripe || !payoutStatus.hasPaypal);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back to Dashboard Link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Referral Commissions</h1>
          <p className="text-muted-foreground">Track your earnings from referrals</p>
        </div>

        {/* Payout Status Banners */}
        {payoutStatus.hasStripe && payoutStatus.hasPaypal && (
          <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Payout Methods Configured</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              You're all set! Both Stripe and PayPal payouts are configured. You'll receive commissions automatically.
            </AlertDescription>
          </Alert>
        )}
        
        {showPayoutReminder && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Complete Your Payout Setup</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <p className="mb-3">
                {!payoutStatus.hasStripe && !payoutStatus.hasPaypal
                  ? "You haven't set up any payout methods yet. Add your bank account or PayPal email to receive commissions."
                  : !payoutStatus.hasStripe
                  ? "Connect your bank account via Stripe to receive commissions from credit card payments."
                  : "Add your PayPal email to receive commissions from PayPal payments."}
              </p>
              <div className="flex flex-wrap gap-2">
                {!payoutStatus.hasStripe && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => {
                      const stripeSection = document.getElementById("stripe-auto-payout-section");
                      if (stripeSection) {
                        stripeSection.scrollIntoView({ behavior: "smooth", block: "center" });
                        // Trigger highlight state
                        window.dispatchEvent(new CustomEvent("highlight-stripe-input"));
                      }
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Connect Bank Account
                  </Button>
                )}
                {!payoutStatus.hasPaypal && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => {
                      const paypalSection = document.getElementById("paypal-auto-payout-section");
                      if (paypalSection) {
                        paypalSection.scrollIntoView({ behavior: "smooth", block: "center" });
                        // Trigger highlight state
                        window.dispatchEvent(new CustomEvent("highlight-paypal-input"));
                      }
                    }}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Add PayPal Email
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Subscriptions</p>
                  <p className="text-3xl font-bold">{totalReferrals}</p>
                  <p className="text-xs text-muted-foreground">Active referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Amount Earned</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">This Month's Signups</p>
                  <p className="text-3xl font-bold text-blue-600">{thisMonthSignups}</p>
                  <p className="text-xs text-muted-foreground">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subscription Value</p>
                  <p className="text-xl font-bold">{formatCurrency(totalSubscriptionValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{formatCurrency(pendingEarnings)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid Out</p>
                  <p className="text-xl font-bold">{formatCurrency(paidEarnings)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per Referral</p>
                  <p className="text-xl font-bold">$5.00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Request Section */}
        {user && (
          <WithdrawalRequestSection 
            pendingEarnings={pendingEarnings} 
            userId={user.id}
            onPayoutStatusChange={fetchPayoutStatus}
          />
        )}

        {/* Referral Network Section */}
        {user && (
          <ReferralNetworkSection userId={user.id} />
        )}

        {/* Referral Email Form */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Referral</CardTitle>
                <CardDescription>Invite anyone by email. When they subscribe, you earn $5 every month for as long as their subscription stays active</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailTo">Email Address</Label>
              <Input
                id="emailTo"
                type="email"
                placeholder="friend@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                type="text"
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="emailMessage">Message</Label>
              <Textarea
                id="emailMessage"
                placeholder="Write your message..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="min-h-[300px] h-full resize-none"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)} 
                disabled={sendingEmail}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail} className="flex-1">
                {sendingEmail ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {sendingEmail ? "Sending..." : "Send"}
              </Button>
              <Button variant="outline" onClick={handleResetToDefault} disabled={sendingEmail}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={handleCancelEmail} disabled={sendingEmail}>
                Cancel
              </Button>
            </div>

            {/* Email Preview Modal */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Preview
                  </DialogTitle>
                  <DialogDescription>
                    This is how your email will appear to the recipient
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <div className="bg-muted rounded-md px-3 py-2 text-sm">
                      {emailTo || <span className="text-muted-foreground italic">No recipient specified</span>}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <div className="bg-muted rounded-md px-3 py-2 text-sm font-medium">
                      {emailSubject}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <div className="bg-muted rounded-md px-4 py-3 text-sm whitespace-pre-wrap">
                      {emailMessage.replace(/\{\{referral_link\}\}/g, referralUrl || "[Your referral link]")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={() => {
                      setShowPreview(false);
                      handleSendEmail();
                    }} 
                    disabled={sendingEmail || !emailTo} 
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
                    Edit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Referral URL Section */}
            <div className="pt-4 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">Your Referral Link</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono truncate">
                  {referralUrl || "Loading..."}
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyUrl}
                  disabled={!referralUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Copy this link to share via text message or social media
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Commissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission History</CardTitle>
            <CardDescription>All your referral earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No commissions yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Share your referral link to start earning!
                </p>
                <Button onClick={() => navigate("/pricing")}>
                  Get Your Referral Link
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div 
                    key={commission.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        commission.status === "paid" ? "bg-green-500/10" : "bg-yellow-500/10"
                      }`}>
                        {commission.status === "paid" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">Referral Commission</p>
                          {/* Payment source badge */}
                          {commission.payment_provider && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                commission.payment_provider === 'paypal' 
                                  ? 'border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/30' 
                                  : 'border-purple-500/50 text-purple-600 bg-purple-50 dark:bg-purple-950/30'
                              }`}
                            >
                              {commission.payment_provider === 'paypal' ? (
                                <Wallet className="h-3 w-3 mr-1" />
                              ) : (
                                <CreditCard className="h-3 w-3 mr-1" />
                              )}
                              via {commission.payment_provider === 'paypal' ? 'PayPal' : 'Stripe'}
                            </Badge>
                          )}
                          {/* Expected payout method for pending commissions */}
                          {commission.status === 'pending' && !payoutStatus.isLoading && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            >
                              {(() => {
                                // Determine expected payout method based on configured methods
                                if (payoutStatus.hasStripe && payoutStatus.hasPaypal) {
                                  return "→ Stripe or PayPal";
                                } else if (payoutStatus.hasStripe) {
                                  return "→ Bank (Stripe)";
                                } else if (payoutStatus.hasPaypal) {
                                  return "→ PayPal";
                                } else {
                                  return "⚠ No payout method";
                                }
                              })()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(commission.created_at)}
                          {commission.paid_at && ` • Paid ${formatDate(commission.paid_at)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">
                        +{formatCurrency(commission.amount, commission.currency)}
                      </span>
                      {getStatusBadge(commission.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Commissions;
