import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FirstTimeOnboarding } from "./FirstTimeOnboarding";
import { PayoutSetupModal } from "@/components/payout/PayoutSetupModal";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<"checking" | "onboarding" | "payout" | "complete">("checking");

  useEffect(() => {
    if (!authLoading && user) {
      // Start with onboarding check
      setStep("onboarding");
    } else if (!authLoading && !user) {
      // No user, skip all onboarding
      setStep("complete");
    }
  }, [user, authLoading]);

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
