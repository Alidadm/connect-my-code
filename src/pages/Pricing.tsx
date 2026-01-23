import { Check, Crown, Loader2, FlaskConical, Home, UserPlus, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// PayPal SVG icon
const PayPalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.648h6.567c2.963 0 5.033.947 5.9 2.7.388.783.537 1.637.458 2.58-.016.188-.038.378-.067.573-.484 3.155-2.584 4.912-6.273 4.912h-2.39a.77.77 0 0 0-.76.648l-.935 5.852zm7.167-17.267h-4.94l-1.89 11.886h2.39c2.95 0 4.57-1.3 4.95-3.766.02-.138.037-.274.05-.408.1-.93-.07-1.64-.51-2.15-.59-.68-1.57-1.03-2.91-1.03h-1.14l.61-3.83h4.94c1.61 0 2.22.45 2.22 1.43 0 .16-.02.33-.05.51z"/>
  </svg>
);

const Pricing = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { subscribed, subscriptionEnd, loading: subLoading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const features = [
    t("pricing.features.unlimitedPosts"),
    t("pricing.features.realTimeMessaging"),
    t("pricing.features.createEvents"),
    t("pricing.features.exclusiveCommunity"),
    t("pricing.features.adFree"),
    t("pricing.features.prioritySupport"),
    t("pricing.features.earnReferrals"),
  ];
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
      toast.success(t("pricing.checkoutSuccess"));
      checkSubscription();
    } else if (checkout === "canceled") {
      toast.info(t("pricing.checkoutCanceled"));
    }
  }, [searchParams, checkSubscription, t]);

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

  const handlePayPalSubscribe = async () => {
    if (!user) {
      navigate("/signup");
      return;
    }

    setPaypalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        const opened = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!opened) window.location.href = data.url;
      } else {
        throw new Error("No PayPal approval URL received");
      }
    } catch (error: any) {
      toast.error("Failed to start PayPal checkout: " + error.message);
      console.error(error);
    } finally {
      setPaypalLoading(false);
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
            {t("pricing.title").split("DolphySN").map((part, i) => 
              i === 0 ? part : <><span className="text-primary">DolphySN</span>{part}</>
            )}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="max-w-md mx-auto border-primary/20 shadow-xl relative overflow-hidden">
          {subscribed && (
            <div className="absolute top-4 right-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" />
                {t("pricing.active")}
              </span>
            </div>
          )}
          
          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-2xl">{t("pricing.monthlySubscription")}</CardTitle>
            <CardDescription>{t("pricing.fullAccess")}</CardDescription>
            <div className="mt-6">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
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
                {t("common.loading")}
              </Button>
            ) : subscribed ? (
              <>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                >
                  {t("pricing.manageSubscription")}
                </Button>
                {subscriptionEnd && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t("pricing.renewsOn", { date: new Date(subscriptionEnd).toLocaleDateString() })}
                  </p>
                )}
              </>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-2">{t("auth.choosePayment")}</p>
                
                {/* Stripe/Card Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={checkoutLoading || paypalLoading}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("auth.startingCheckout")}
                    </>
                  ) : user ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t("auth.payWithCard")}
                    </>
                  ) : (
                    t("auth.signUpToSubscribe")
                  )}
                </Button>

                {/* PayPal Button */}
                {user && (
                  <Button 
                    variant="outline"
                    className="w-full bg-[#0070ba] hover:bg-[#005c96] text-white border-[#0070ba] hover:border-[#005c96]" 
                    size="lg"
                    onClick={handlePayPalSubscribe}
                    disabled={checkoutLoading || paypalLoading}
                  >
                    {paypalLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("auth.connectingPaypal")}
                      </>
                    ) : (
                      <>
                        <PayPalIcon />
                        <span className="ml-2">{t("auth.payWithPaypal")}</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Referral callout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t("pricing.referralCallout")}
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

        {/* Temporary Navigation Links - For Development */}
        <div className="mt-8 text-center">
          <div className="inline-block p-4 border border-dashed border-blue-500/50 rounded-lg bg-blue-500/5">
            <p className="text-xs text-blue-600 mb-3 font-medium">🔗 Quick Navigation (Dev)</p>
            <div className="flex gap-3">
              <Link to="/signup">
                <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10">
                  <UserPlus className="h-3 w-3 mr-2" />
                  Registration Page
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10">
                  <Home className="h-3 w-3 mr-2" />
                  Member Home Page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
