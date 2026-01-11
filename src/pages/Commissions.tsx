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

  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingEarnings = commissions.filter(c => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
  const paidEarnings = commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const totalReferrals = commissions.length;

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-xl font-bold">{formatCurrency(totalEarnings)}</p>
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
                  <Wallet className="h-5 w-5 text-green-600" />
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
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referrals</p>
                  <p className="text-xl font-bold">{totalReferrals}</p>
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
