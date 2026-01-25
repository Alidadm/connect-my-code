import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Feed } from "@/components/feed/Feed";
import { PayoutSetupModal } from "@/components/payout/PayoutSetupModal";
import { BirthdayCelebration } from "@/components/birthday/BirthdayCelebration";
import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const [payoutSetupComplete, setPayoutSetupComplete] = useState(false);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show landing page for non-authenticated users
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
