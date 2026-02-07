import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Feed } from "@/components/feed/Feed";
import { PayoutSetupModal } from "@/components/payout/PayoutSetupModal";
import { BirthdayCelebration } from "@/components/birthday/BirthdayCelebration";
import { useAuth } from "@/hooks/useAuth";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { LandingPage } from "@/components/landing/LandingPage";

const Index = () => {
  const { user, loading } = useAuth();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const [payoutSetupComplete, setPayoutSetupComplete] = useState(false);

  // Show loading state while checking auth or maintenance mode
  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Temporarily show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />;
  }

  // Show member feed for authenticated users
  return (
    <MainLayout>
      {!payoutSetupComplete && (
        <PayoutSetupModal 
          userId={user.id} 
          onComplete={() => setPayoutSetupComplete(true)} 
        />
      )}
      {/* Birthday celebration modal - shows on user's birthday */}
      <BirthdayCelebration />
      <Feed />
    </MainLayout>
  );
};

export default Index;
