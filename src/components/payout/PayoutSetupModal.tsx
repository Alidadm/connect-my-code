import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { CreditCard, Wallet, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

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

export const PayoutSetupModal = ({ userId, onComplete }: PayoutSetupModalProps) => {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [loadingPaypal, setLoadingPaypal] = useState(true);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    checkPayoutSetupNeeded();
  }, [userId]);

  const checkPayoutSetupNeeded = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // No valid session - silently complete to avoid showing modal
        onComplete();
        return;
      }

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

      // Handle auth errors gracefully
      if (response.status === 401) {
        onComplete();
        return;
      }

      const result = await response.json();
      
      if (response.ok) {
        // If payout setup is already completed, skip the modal
        if (result.payout_setup_completed) {
          onComplete();
          return;
        }

        // Load existing data
        if (result.paypal_payout_email) {
          setPaypalEmail(result.paypal_payout_email);
        }
      }

      // Check Stripe status
      await checkStripeStatus(session.access_token);
      setLoadingPaypal(false);
      
      // Show the modal
      setShown(true);
      showSetupModal();
    } catch (error) {
      console.error("Error checking payout setup:", error);
      setCheckingStripe(false);
      setLoadingPaypal(false);
      onComplete(); // Complete on error to avoid blocking
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

      // Handle auth errors gracefully - just skip setting status
      if (response.status === 401) {
        return;
      }

      const result = await response.json();
      if (response.ok) {
        setStripeStatus(result);
      }
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

    const result = await Swal.fire({
      title: "🎉 Welcome! Set Up Your Payouts",
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
              <strong>📢 Important:</strong> Please make sure you update both payment methods for receiving commissions. 
              Each new member chooses one payment method to pay their subscription, and their commission will also be sent to you through that same method. 
              This means you must have both payment methods set up to receive commissions from all members, no matter which method they use.
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f8f9ff 0%, #fff8f8 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 18px;">💳</span>
              <strong style="color: #7c3aed;">Stripe (Bank Transfer)</strong>
              <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Optional</span>
              ${isStripeReady ? '<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px;">✓ Connected</span>' : ''}
            </div>
            <p style="color: #666; font-size: 13px; margin-bottom: 8px;">
              ${isStripeReady 
                ? 'Your bank account is connected for direct transfers.' 
                : 'For direct bank deposits. Stripe requires identity verification for security - your info is pre-filled to speed this up.'
              }
            </p>
            <button id="swal-stripe-btn" class="swal2-confirm swal2-styled" style="background: ${isStripeReady ? '#22c55e' : '#7c3aed'}; font-size: 13px; padding: 8px 16px;">
              ${isStripeReady ? '✓ Stripe Connected' : 'Connect Bank Account to Receive Auto Commissions'}
            </button>
            ${!isStripeReady ? '<p style="color: #999; font-size: 11px; margin-top: 6px; margin-bottom: 0;">Skip this if you prefer PayPal only</p>' : ''}
          </div>

          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #fef3e0 100%); border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 18px;">💰</span>
              <strong style="color: #2563eb;">PayPal Email</strong>
              <span id="paypal-status" style="display: ${paypalEmail ? 'inline' : 'none'}; background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px;">✓ Saved</span>
            </div>
            <p style="color: #666; font-size: 13px; margin-bottom: 8px;">
              Enter your PayPal email to receive PayPal-based commissions.
            </p>
            <input 
              type="email" 
              id="swal-paypal-email" 
              class="swal2-input" 
              placeholder="your@paypal-email.com"
              value="${paypalEmail || ''}"
              style="margin: 0; width: 100%; font-size: 14px;"
            >
          </div>

          <p style="margin-top: 16px; color: #999; font-size: 12px; text-align: center;">
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
      width: 500,
      didOpen: () => {
        const stripeBtn = document.getElementById("swal-stripe-btn");
        if (stripeBtn && !isStripeReady) {
          stripeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleConnectStripe(session.access_token);
          });
        }

        const paypalInput = document.getElementById("swal-paypal-email") as HTMLInputElement;
        if (paypalInput) {
          paypalInput.addEventListener("input", () => {
            const statusEl = document.getElementById("paypal-status");
            if (statusEl) {
              statusEl.style.display = "none";
            }
          });
        }
      },
      preConfirm: async () => {
        const paypalInput = document.getElementById("swal-paypal-email") as HTMLInputElement;
        const newPaypalEmail = paypalInput?.value?.trim() || "";

        // Validate PayPal email if provided
        if (newPaypalEmail && !newPaypalEmail.includes("@")) {
          Swal.showValidationMessage("Please enter a valid PayPal email address");
          return false;
        }

        return { paypalEmail: newPaypalEmail };
      },
    });

    if (result.isConfirmed && result.value) {
      await savePayoutSettings(session.access_token, result.value.paypalEmail);
    } else if (result.isDismissed) {
      // User chose to set up later - mark as completed in database so modal doesn't show again
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-private-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              payout_setup_completed: true,
            }),
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

      if (!response.ok) {
        throw new Error(result.error || "Failed to start Stripe onboarding");
      }

      if (result.status === "complete") {
        toast.success("Your Stripe account is already connected!");
        // Refresh the modal to show updated status
        await checkStripeStatus(accessToken);
        showSetupModal();
      } else if (result.url) {
        // Open Stripe onboarding in new tab
        window.open(result.url, "_blank");
        toast.info("Complete your Stripe account setup in the new tab, then return here");
        
        // Poll for Stripe connection status
        pollStripeStatus(accessToken);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Stripe account");
      console.error(error);
    } finally {
      Swal.hideLoading();
    }
  };

  const pollStripeStatus = (accessToken: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 5 minutes max
    
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
          toast.success("Stripe account connected successfully!");
          
          // Update the button in the modal
          const stripeBtn = document.getElementById("swal-stripe-btn");
          if (stripeBtn) {
            stripeBtn.textContent = "✓ Stripe Connected";
            stripeBtn.style.background = "#22c55e";
          }
        }
      } catch (error) {
        console.error("Error polling Stripe status:", error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds
  };

  const savePayoutSettings = async (accessToken: string, newPaypalEmail: string) => {
    try {
      Swal.showLoading();

      // Save PayPal email and mark setup as completed
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-private-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            paypal_payout_email: newPaypalEmail || null,
            payout_setup_completed: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save payout settings");
      }

      const isStripeReady = stripeStatus?.connected && stripeStatus.status === "active";
      const hasPaypal = !!newPaypalEmail;

      if (isStripeReady && hasPaypal) {
        toast.success("Both payout methods configured! You're all set to receive commissions.");
      } else if (isStripeReady) {
        toast.success("Stripe connected! Add PayPal later for full coverage.");
      } else if (hasPaypal) {
        toast.success("PayPal saved! Connect Stripe later for bank transfers.");
      } else {
        toast.info("Payout setup saved. You can configure methods anytime.");
      }

      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save payout settings");
      console.error(error);
      
      // Still complete even on error - user can set up later
      onComplete();
    }
  };

  // This component doesn't render anything visible - it handles the modal
  return null;
};
