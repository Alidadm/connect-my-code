import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Wallet, CheckCircle2, XCircle, Loader2, ExternalLink, Globe, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PayoutMethodsSectionProps {
  userId: string;
}

interface StripeConnectStatus {
  connected: boolean;
  status: string;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

const STRIPE_COUNTRIES = ["US", "CA", "MX", "United States", "Canada", "Mexico"];

const isStripeEligible = (country: string | null | undefined): boolean => {
  if (!country) return false;
  return STRIPE_COUNTRIES.some(c => c.toLowerCase() === country.toLowerCase());
};

export const PayoutMethodsSection = ({ userId }: PayoutMethodsSectionProps) => {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalEmail, setPaypalEmail] = useState<string | null>(null);
  const [wiseEmail, setWiseEmail] = useState<string | null>(null);
  const [wiseAccountId, setWiseAccountId] = useState<string | null>(null);
  const [payoneerEmail, setPayoneerEmail] = useState<string | null>(null);
  const [payoneerAccountId, setPayoneerAccountId] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    fetchPayoutStatus();
  }, [userId]);

  const fetchPayoutStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Get country
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", userId)
        .single();
      if (profile?.country) setUserCountry(profile.country);

      const [stripeRes, profileRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-my-private-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        }),
      ]);

      if (stripeRes.ok) {
        setStripeStatus(await stripeRes.json());
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setPaypalEmail(profileData.paypal_payout_email || null);
        setWiseEmail(profileData.wise_email || null);
        setWiseAccountId(profileData.wise_account_id || null);
        setPayoneerEmail(profileData.payoneer_email || null);
        setPayoneerAccountId(profileData.payoneer_account_id || null);
      }
    } catch (error) {
      console.error("Error fetching payout status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Please log in again"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ origin: window.location.origin }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to start Stripe onboarding");

      if (result.status === "complete") {
        toast.success("Your Stripe account is already connected!");
        await fetchPayoutStatus();
      } else if (result.url) {
        window.open(result.url, "_blank");
        toast.info("Complete your bank account setup in the new tab, then refresh this page");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  const isStripeActive = stripeStatus?.connected && stripeStatus.status === "active";
  const isStripePending = stripeStatus?.connected && stripeStatus.status === "pending";
  const stripeEligible = isStripeEligible(userCountry);

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading payout methods...</span>
        </div>
      </div>
    );
  }

  const StatusBadge = ({ connected, label }: { connected: boolean; label?: string }) =>
    connected ? (
      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3" /> {label || "Connected"}
      </span>
    ) : (
      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
        <XCircle className="w-3 h-3" /> Not Set
      </span>
    );

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Payout Methods</h4>

      {/* Stripe */}
      <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 ${!stripeEligible ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">Bank Account (Stripe)</h4>
            <p className="text-sm text-slate-500">
              {!stripeEligible
                ? "Only available for US, Canada & Mexico"
                : isStripeActive
                ? "Connected — routing & account number on file"
                : isStripePending
                ? "Setup incomplete — please finish onboarding"
                : "Not connected — add your checking or savings account"}
            </p>
          </div>
          {stripeEligible ? (
            isStripeActive ? (
              <StatusBadge connected={true} />
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={connectingStripe} className="whitespace-nowrap">
                {connectingStripe ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ExternalLink className="w-4 h-4 mr-1" />}
                {isStripePending ? "Continue Setup" : "Connect Bank"}
              </Button>
            )
          ) : (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium whitespace-nowrap">
              US/CA/MX Only
            </span>
          )}
        </div>
      </div>

      {/* PayPal */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">PayPal</h4>
            <p className="text-sm text-slate-500">{paypalEmail ? `Connected — ${paypalEmail}` : "Not connected — add your PayPal email"}</p>
          </div>
          <StatusBadge connected={!!paypalEmail} />
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-13">
          {paypalEmail ? "Update your PayPal email from the Commissions page." : "Go to the Commissions page to add your PayPal email."}
        </p>
      </div>

      {/* Wise */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">Wise</h4>
            <p className="text-sm text-slate-500">
              {wiseEmail ? `Connected — ${wiseEmail}` : "Not connected — add your Wise details"}
              {wiseAccountId ? ` (ID: ${wiseAccountId})` : ""}
            </p>
          </div>
          <StatusBadge connected={!!wiseEmail} />
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-13">
          {wiseEmail ? "Update your Wise details from the Commissions page." : "Go to the Commissions page to add your Wise email & account ID."}
        </p>
      </div>

      {/* Payoneer */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">Payoneer</h4>
            <p className="text-sm text-slate-500">
              {payoneerEmail ? `Connected — ${payoneerEmail}` : "Not connected — add your Payoneer details"}
              {payoneerAccountId ? ` (ID: ${payoneerAccountId})` : ""}
            </p>
          </div>
          <StatusBadge connected={!!payoneerEmail} />
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-13">
          {payoneerEmail ? "Update your Payoneer details from the Commissions page." : "Go to the Commissions page to add your Payoneer email & payee ID."}
        </p>
      </div>

      {/* Info notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>📢 Important:</strong> Members in the USA, Canada, and Mexico can use Stripe or any other method. Members in all other countries must use PayPal, Wise, or Payoneer. Set up multiple methods to maximize commission coverage.
        </p>
      </div>
    </div>
  );
};
