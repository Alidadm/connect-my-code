import { Check, Crown, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const features = [
  "Unlimited posts and stories",
  "Real-time messaging",
  "Create and join events",
  "Exclusive community access",
  "Ad-free experience",
  "Priority support",
  "Earn referral commissions",
];

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, subscriptionEnd, loading: subLoading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // Test function to create a sample commission via edge function
  const handleTestCommission = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-commission");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Test commission created! Check your commissions dashboard.");
    } catch (error: any) {
      toast.error("Failed to create test commission: " + error.message);
      console.error(error);
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription successful! Welcome to WeShare Premium.");
      checkSubscription();
    } else if (checkout === "canceled") {
      toast.info("Checkout was canceled.");
    }
  }, [searchParams, checkSubscription]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/signup");
      return;
    }

    setCheckoutLoading(true);
    try {
      await createCheckout();
    } catch (error) {
      toast.error("Failed to start checkout. Please try again.");
      console.error(error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast.error("Failed to open subscription management. Please try again.");
      console.error(error);
    }
  };

  const loading = authLoading || subLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Join <span className="text-primary">WeShare</span> Premium
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with friends, share moments, and earn money through referrals. 
            One simple subscription unlocks everything.
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="max-w-md mx-auto border-primary/20 shadow-xl relative overflow-hidden">
          {subscribed && (
            <div className="absolute top-4 right-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Active
              </span>
            </div>
          )}
          
          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-2xl">Monthly Subscription</CardTitle>
            <CardDescription>Full access to everything</CardDescription>
            <div className="mt-6">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          
          <CardContent className="pb-8">
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3 pb-8">
            {loading ? (
              <Button disabled className="w-full">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </Button>
            ) : subscribed ? (
              <>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                >
                  Manage Subscription
                </Button>
                {subscriptionEnd && (
                  <p className="text-xs text-muted-foreground text-center">
                    Your subscription renews on {new Date(subscriptionEnd).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSubscribe}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting checkout...
                  </>
                ) : user ? (
                  "Subscribe Now"
                ) : (
                  "Sign Up to Subscribe"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Referral callout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">
              Earn $5 for every friend you refer!
            </span>
          </div>
        </div>

        {/* Test Commission Button - For Development Only */}
        {user && (
          <div className="mt-8 text-center">
            <div className="inline-block p-4 border border-dashed border-yellow-500/50 rounded-lg bg-yellow-500/5">
              <p className="text-xs text-yellow-600 mb-2 font-medium">🧪 Development Testing</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestCommission}
                disabled={testLoading}
                className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-3 w-3 mr-2" />
                    Create Test Commission
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
