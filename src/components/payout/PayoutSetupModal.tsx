import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface PayoutSetupModalProps {
  userId: string;
  onComplete: () => void;
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

export const PayoutSetupModal = ({ userId, onComplete }: PayoutSetupModalProps) => {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [wiseAccountId, setWiseAccountId] = useState("");
  const [payoneerEmail, setPayoneerEmail] = useState("");
  const [payoneerAccountId, setPayoneerAccountId] = useState("");
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [loadingPaypal, setLoadingPaypal] = useState(true);

  useEffect(() => {
    checkPayoutSetupNeeded();
  }, [userId]);

  const checkPayoutSetupNeeded = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onComplete();
        return;
      }

      // Get user's country from public profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", userId)
        .single();
      
      if (profile?.country) setUserCountry(profile.country);

      // Check if payout setup is already completed
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-my-private-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.status === 401) {
        onComplete();
        return;
      }

      const result = await response.json();

      if (response.ok) {
        if (result.payout_setup_completed) {
          onComplete();
          return;
        }
        if (result.paypal_payout_email) setPaypalEmail(result.paypal_payout_email);
        if (result.wise_email) setWiseEmail(result.wise_email);
        if (result.wise_account_id) setWiseAccountId(result.wise_account_id);
        if (result.payoneer_email) setPayoneerEmail(result.payoneer_email);
        if (result.payoneer_account_id) setPayoneerAccountId(result.payoneer_account_id);
      }

      await checkStripeStatus(session.access_token);
      setLoadingPaypal(false);
      showSetupModal();
    } catch (error) {
      console.error("Error checking payout setup:", error);
      setCheckingStripe(false);
      setLoadingPaypal(false);
      onComplete();
    }
  };

  const checkStripeStatus = async (accessToken: string) => {
    setCheckingStripe(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );
      if (response.status === 401) return;
      const result = await response.json();
      if (response.ok) setStripeStatus(result);
    } catch (error) {
      console.error("Error checking Stripe status:", error);
    } finally {
      setCheckingStripe(false);
    }
  };

  const showSetupModal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const isStripeReady = stripeStatus?.connected && stripeStatus.status === "active";
    const stripeEligible = isStripeEligible(userCountry);

    const result = await Swal.fire({
      title: "🎉 Welcome! Set Up Your Payouts",
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; max-height: 65vh; overflow-y: auto;">
          <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
              <strong>📢 Important:</strong> Set up at least one payout method to receive referral commissions. 
              Members in the <strong>USA, Canada, and Mexico</strong> may use Stripe (bank transfer) or any other method. 
              Members in <strong>all other countries</strong> must use PayPal, Wise, or Payoneer.
            </p>
          </div>
          
          <!-- Stripe Section -->
          <div style="background: linear-gradient(135deg, #f8f9ff 0%, #fff8f8 100%); border-radius: 12px; padding: 16px; margin-bottom: 12px; ${!stripeEligible ? 'opacity: 0.5;' : ''}">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 18px;">💳</span>
              <strong style="color: #7c3aed;">Stripe (Bank Transfer)</strong>
              ${!stripeEligible 
                ? '<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px;">US/CA/MX Only</span>' 
                : isStripeReady 
                  ? '<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px;">✓ Connected</span>' 
                  : '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Optional</span>'
              }
            </div>
            <p style="color: #666; font-size: 12px; margin-bottom: 8px;">
              ${!stripeEligible 
                ? 'Stripe bank payouts are only available for members in the United States, Canada, and Mexico.' 
                : isStripeReady 
                  ? 'Your bank account is connected for direct transfers.' 
                  : 'For direct bank deposits. Your info is pre-filled to speed up setup.'
              }
            </p>
            ${stripeEligible ? `
              <button id="swal-stripe-btn" class="swal2-confirm swal2-styled" style="background: ${isStripeReady ? '#22c55e' : '#7c3aed'}; font-size: 13px; padding: 8px 16px;" ${isStripeReady ? 'disabled' : ''}>
                ${isStripeReady ? '✓ Stripe Connected' : 'Connect Bank Account'}
              </button>
            ` : ''}
          </div>

          <!-- PayPal Section -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #fef3e0 100%); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 18px;">💰</span>
              <strong style="color: #2563eb;">PayPal</strong>
            </div>
            <input type="email" id="swal-paypal-email" class="swal2-input" placeholder="your@paypal-email.com" value="${paypalEmail || ''}" style="margin: 0; width: 100%; font-size: 14px;">
          </div>

          <!-- Wise Section -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 18px;">🌍</span>
              <strong style="color: #059669;">Wise</strong>
            </div>
            <input type="email" id="swal-wise-email" class="swal2-input" placeholder="your@wise-email.com" value="${wiseEmail || ''}" style="margin: 0 0 8px 0; width: 100%; font-size: 14px;">
            <input type="text" id="swal-wise-account-id" class="swal2-input" placeholder="Wise Account/Profile ID" value="${wiseAccountId || ''}" style="margin: 0; width: 100%; font-size: 14px;">
          </div>

          <!-- Payoneer Section -->
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 18px;">💸</span>
              <strong style="color: #d97706;">Payoneer</strong>
            </div>
            <input type="email" id="swal-payoneer-email" class="swal2-input" placeholder="your@payoneer-email.com" value="${payoneerEmail || ''}" style="margin: 0 0 8px 0; width: 100%; font-size: 14px;">
            <input type="text" id="swal-payoneer-account-id" class="swal2-input" placeholder="Payoneer Account/Payee ID" value="${payoneerAccountId || ''}" style="margin: 0; width: 100%; font-size: 14px;">
          </div>

          <p style="margin-top: 12px; color: #999; font-size: 12px; text-align: center;">
            You can update these settings anytime in your Commissions dashboard.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save & Continue",
      cancelButtonText: "Set Up Later",
      confirmButtonColor: "#1c76e6",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      allowEscapeKey: false,
      width: 540,
      didOpen: () => {
        const stripeBtn = document.getElementById("swal-stripe-btn");
        if (stripeBtn && !isStripeReady && stripeEligible) {
          stripeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleConnectStripe(session.access_token);
          });
        }
      },
      preConfirm: async () => {
        const paypalInput = document.getElementById("swal-paypal-email") as HTMLInputElement;
        const wiseEmailInput = document.getElementById("swal-wise-email") as HTMLInputElement;
        const wiseAccountInput = document.getElementById("swal-wise-account-id") as HTMLInputElement;
        const payoneerEmailInput = document.getElementById("swal-payoneer-email") as HTMLInputElement;
        const payoneerAccountInput = document.getElementById("swal-payoneer-account-id") as HTMLInputElement;

        const newPaypalEmail = paypalInput?.value?.trim() || "";
        const newWiseEmail = wiseEmailInput?.value?.trim() || "";
        const newWiseAccountId = wiseAccountInput?.value?.trim() || "";
        const newPayoneerEmail = payoneerEmailInput?.value?.trim() || "";
        const newPayoneerAccountId = payoneerAccountInput?.value?.trim() || "";

        if (newPaypalEmail && !newPaypalEmail.includes("@")) {
          Swal.showValidationMessage("Please enter a valid PayPal email");
          return false;
        }
        if (newWiseEmail && !newWiseEmail.includes("@")) {
          Swal.showValidationMessage("Please enter a valid Wise email");
          return false;
        }
        if (newPayoneerEmail && !newPayoneerEmail.includes("@")) {
          Swal.showValidationMessage("Please enter a valid Payoneer email");
          return false;
        }

        return { paypalEmail: newPaypalEmail, wiseEmail: newWiseEmail, wiseAccountId: newWiseAccountId, payoneerEmail: newPayoneerEmail, payoneerAccountId: newPayoneerAccountId };
      },
    });

    if (result.isConfirmed && result.value) {
      await savePayoutSettings(session.access_token, result.value);
    } else if (result.isDismissed) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-private-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ payout_setup_completed: true }),
          }
        );
      } catch (error) {
        console.error("Error saving payout setup status:", error);
      }
      toast.info("You can set up payouts anytime in your Commissions dashboard");
      onComplete();
    }
  };

  const handleConnectStripe = async (accessToken: string) => {
    try {
      Swal.showLoading();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ origin: window.location.origin }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to start Stripe onboarding");

      if (result.status === "complete") {
        toast.success("Your Stripe account is already connected!");
        await checkStripeStatus(accessToken);
        showSetupModal();
      } else if (result.url) {
        window.open(result.url, "_blank");
        toast.info("Complete your Stripe setup in the new tab, then return here");
        pollStripeStatus(accessToken);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Stripe");
    } finally {
      Swal.hideLoading();
    }
  };

  const pollStripeStatus = (accessToken: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
          }
        );
        const result = await response.json();
        if (response.ok && result.connected && result.status === "active") {
          clearInterval(interval);
          setStripeStatus(result);
          toast.success("Stripe account connected!");
          const stripeBtn = document.getElementById("swal-stripe-btn");
          if (stripeBtn) {
            stripeBtn.textContent = "✓ Stripe Connected";
            stripeBtn.style.background = "#22c55e";
          }
        }
      } catch (error) {
        console.error("Error polling Stripe status:", error);
      }
      if (attempts >= 60) clearInterval(interval);
    }, 5000);
  };

  const savePayoutSettings = async (
    accessToken: string,
    values: { paypalEmail: string; wiseEmail: string; wiseAccountId: string; payoneerEmail: string; payoneerAccountId: string }
  ) => {
    try {
      Swal.showLoading();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-private-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            paypal_payout_email: values.paypalEmail || null,
            wise_email: values.wiseEmail || null,
            wise_account_id: values.wiseAccountId || null,
            payoneer_email: values.payoneerEmail || null,
            payoneer_account_id: values.payoneerAccountId || null,
            payout_setup_completed: true,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save payout settings");

      const methodsConfigured = [
        stripeStatus?.connected && stripeStatus.status === "active",
        !!values.paypalEmail,
        !!values.wiseEmail,
        !!values.payoneerEmail,
      ].filter(Boolean).length;

      if (methodsConfigured > 0) {
        toast.success(`${methodsConfigured} payout method${methodsConfigured > 1 ? 's' : ''} configured!`);
      } else {
        toast.info("Payout setup saved. Configure methods anytime.");
      }
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save payout settings");
      onComplete();
    }
  };

  return null;
};
