import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface PayoutStatus {
  stripeConnected: boolean;
  stripeActive: boolean;
  paypalConfigured: boolean;
  wiseConfigured: boolean;
  payoneerConfigured: boolean;
  loading: boolean;
  needsSetup: boolean;
}

export const usePayoutStatus = () => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<PayoutStatus>({
    stripeConnected: false,
    stripeActive: false,
    paypalConfigured: false,
    wiseConfigured: false,
    payoneerConfigured: false,
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
      let wiseConfigured = false;
      let payoneerConfigured = false;
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        paypalConfigured = !!profileData.paypal_payout_email;
        wiseConfigured = !!profileData.wise_email;
        payoneerConfigured = !!profileData.payoneer_email;
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

      // User needs setup if no payout method is configured at all
      const hasAnyMethod = stripeActive || paypalConfigured || wiseConfigured || payoneerConfigured;
      const needsSetup = !hasAnyMethod;

      setStatus({
        stripeConnected,
        stripeActive,
        paypalConfigured,
        wiseConfigured,
        payoneerConfigured,
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
