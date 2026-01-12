import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      fetchCommissions();
    }
  }, [user, authLoading, navigate]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Referral Commissions</h1>
            <p className="text-muted-foreground">Track your earnings from referrals</p>
          </div>
        </div>

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
                        <p className="font-medium">Referral Commission</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(commission.created_at)}
                          {commission.payment_provider && (
                            <span className="text-xs text-muted-foreground/80 ml-1">
                              ({commission.payment_provider === 'paypal' ? 'PayPal' : 'Credit Card'})
                            </span>
                          )}
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
    </div>
  );
};

export default Commissions;
