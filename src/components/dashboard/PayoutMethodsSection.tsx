import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Wallet, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
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

export const PayoutMethodsSection = ({ userId }: PayoutMethodsSectionProps) => {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalEmail, setPaypalEmail] = useState<string | null>(null);
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

      // Fetch Stripe status and private profile in parallel
      const [stripeRes, profileRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-my-private-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }),
      ]);

      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        setStripeStatus(stripeData);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setPaypalEmail(profileData.paypal_payout_email || null);
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
      if (!session?.access_token) {
        toast.error("Please log in again");
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

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Payout Methods</h4>
      
      {/* Stripe Bank Account */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">Bank Account (Stripe)</h4>
            <p className="text-sm text-slate-500">
              {isStripeActive
                ? "Connected — routing & account number on file"
                : isStripePending
                ? "Setup incomplete — please finish onboarding"
                : "Not connected — add your checking or savings account"}
            </p>
          </div>
          {isStripeActive ? (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="whitespace-nowrap"
            >
              {connectingStripe ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-1" />
              )}
              {isStripePending ? "Continue Setup" : "Connect Bank"}
            </Button>
          )}
        </div>
        {!isStripeActive && (
          <p className="text-xs text-slate-400 mt-2 ml-13">
            Stripe will ask for your routing number and account number (checking or savings). Your info is pre-filled to speed up the process.
          </p>
        )}
      </div>

      {/* PayPal */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-800">PayPal</h4>
            <p className="text-sm text-slate-500">
              {paypalEmail
                ? `Connected — ${paypalEmail}`
                : "Not connected — add your PayPal email"}
            </p>
          </div>
          {paypalEmail ? (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
              <XCircle className="w-3 h-3" /> Not Set
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2 ml-13">
          {paypalEmail
            ? "You can update your PayPal email from the Commissions page."
            : "Go to the Commissions page to add your PayPal email."}
        </p>
      </div>

      {/* Info notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>📢 Important:</strong> Set up both payment methods to receive commissions from all members, regardless of which method they used to subscribe.
        </p>
      </div>
    </div>
  );
};
