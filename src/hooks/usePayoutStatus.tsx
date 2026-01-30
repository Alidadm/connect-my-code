import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface PayoutStatus {
  stripeConnected: boolean;
  stripeActive: boolean;
  paypalConfigured: boolean;
  loading: boolean;
  needsSetup: boolean;
}

export const usePayoutStatus = () => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<PayoutStatus>({
    stripeConnected: false,
    stripeActive: false,
    paypalConfigured: false,
    loading: true,
    needsSetup: false,
  });

  const checkPayoutStatus = useCallback(async () => {
    if (!session?.access_token || !user) {
      setStatus(prev => ({ ...prev, loading: false, needsSetup: false }));
      return;
    }

    try {
      // Check private profile for PayPal and payout setup status
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

      let paypalConfigured = false;
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        paypalConfigured = !!profileData.paypal_payout_email;
      }

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

      let stripeConnected = false;
      let stripeActive = false;

      if (stripeResponse.ok) {
        const stripeData = await stripeResponse.json();
        stripeConnected = stripeData.connected || false;
        stripeActive = stripeData.connected && stripeData.status === "active";
      }

      // User needs setup if either Stripe is not active OR PayPal is not configured
      const needsSetup = !stripeActive || !paypalConfigured;

      setStatus({
        stripeConnected,
        stripeActive,
        paypalConfigured,
        loading: false,
        needsSetup,
      });
    } catch (error) {
      console.error("Error checking payout status:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [session, user]);

  useEffect(() => {
    checkPayoutStatus();
  }, [checkPayoutStatus]);

  return {
    ...status,
    refresh: checkPayoutStatus,
  };
};
