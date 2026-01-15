import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Feed } from "@/components/feed/Feed";
import { PayoutSetupModal } from "@/components/payout/PayoutSetupModal";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  const [payoutSetupComplete, setPayoutSetupComplete] = useState(false);

  return (
    <MainLayout>
      {user && !payoutSetupComplete && (
        <PayoutSetupModal 
          userId={user.id} 
          onComplete={() => setPayoutSetupComplete(true)} 
        />
      )}
      <Feed />
    </MainLayout>
  );
};

export default Index;
