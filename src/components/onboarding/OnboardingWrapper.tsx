import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FirstTimeOnboarding } from "./FirstTimeOnboarding";
import { PayoutSetupModal } from "@/components/payout/PayoutSetupModal";

// Routes where onboarding should never appear
const EXCLUDED_ROUTES = [
  "/signup",
  "/login",
  "/verify-email",
  "/confirm-email",
  "/forgot-password",
  "/reset-password",
];

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState<"checking" | "onboarding" | "payout" | "complete">("checking");

  // Check if current route should skip onboarding
  const isExcludedRoute = EXCLUDED_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  useEffect(() => {
    // Skip onboarding on excluded routes
    if (isExcludedRoute) {
      setStep("complete");
      return;
    }

    if (!authLoading && user) {
      // Start with onboarding check
      setStep("onboarding");
    } else if (!authLoading && !user) {
      // No user, skip all onboarding
      setStep("complete");
    }
  }, [user, authLoading, isExcludedRoute]);

  const handleOnboardingComplete = () => {
    // After onboarding, show payout setup
    setStep("payout");
  };

  const handlePayoutComplete = () => {
    // All done
    setStep("complete");
  };

  // While checking auth or in checking state, just show children
  if (authLoading || step === "checking") {
    return <>{children}</>;
  }

  // Show first-time onboarding
  if (step === "onboarding" && user) {
    return (
      <>
        {children}
        <FirstTimeOnboarding onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // Show payout setup modal
  if (step === "payout" && user) {
    return (
      <>
        {children}
        <PayoutSetupModal userId={user.id} onComplete={handlePayoutComplete} />
      </>
    );
  }

  // Complete - just show children
  return <>{children}</>;
};
