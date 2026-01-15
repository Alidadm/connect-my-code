import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingPayPal, setIsVerifyingPayPal] = useState(false);
  const [paypalVerified, setPaypalVerified] = useState(false);
  const checkoutStatus = searchParams.get("checkout");
  const provider = searchParams.get("provider");

  const didAutoSendRef = useRef(false);
  const didPayPalVerifyRef = useRef(false);

  useEffect(() => {
    // Get current user's email
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  // Immediately verify PayPal subscription when returning from PayPal
  // Also check if user has a PayPal subscription even without URL params (for edge cases)
  useEffect(() => {
    if (didPayPalVerifyRef.current) return;
    
    // Only run for PayPal returns OR when checkout=success (to detect PayPal users)
    const isPayPalReturn = provider === "paypal" && checkoutStatus === "success";
    const isSuccessReturn = checkoutStatus === "success";
    
    if (!isPayPalReturn && !isSuccessReturn) return;

    const verifyPayPalSubscription = async () => {
      didPayPalVerifyRef.current = true;
      setIsVerifyingPayPal(true);
      
      try {
        console.log("Attempting PayPal subscription verification...");
        const { data, error } = await supabase.functions.invoke("verify-paypal-subscription");
        
        if (error) {
          console.error("PayPal verification error:", error);
          // Fall back to manual resend for non-PayPal users
          if (!isPayPalReturn) {
            setIsVerifyingPayPal(false);
          }
          return;
        }

        console.log("PayPal verification response:", data);

        if (data?.verified) {
          setPaypalVerified(true);
          toast.success("Payment verified! Check your email for verification link.");
        } else if (data?.reason === "no_subscription") {
          // Not a PayPal user, ignore
          console.log("User does not have PayPal subscription");
        } else if (data?.status === "APPROVAL_PENDING") {
          toast.info("Please complete approval in PayPal to activate your subscription.");
        } else {
          // Subscription not active yet
          console.log("PayPal subscription status:", data?.status, data?.reason);
        }
      } catch (err) {
        console.error("Failed to verify PayPal subscription:", err);
      } finally {
        setIsVerifyingPayPal(false);
      }
    };

    // Small delay to ensure PayPal has processed
    const t = window.setTimeout(verifyPayPalSubscription, 1000);
    return () => window.clearTimeout(t);
  }, [provider, checkoutStatus]);

  const handleResendEmail = async (silent = false) => {
    if (!userEmail) {
      if (!silent) toast.error("Unable to resend email. Please try again later.");
      return;
    }

    setIsResending(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!silent) toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      // Get user's profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const userName =
        profile?.display_name ||
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
        "Member";

      // Trigger the confirmation email again
      const { error } = await supabase.functions.invoke("send-signup-confirmation", {
        body: {
          email: userEmail,
          name: userName,
          userId: user.id,
        },
      });

      if (error) throw error;
      if (!silent) toast.success("Verification email sent! Check your inbox.");
    } catch (err: any) {
      console.error("Failed to resend email:", err);
      if (!silent) toast.error("Failed to resend email. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  // Auto-send once when we land here after non-PayPal payment (webhooks can be delayed).
  // For PayPal, we use the verify-paypal-subscription function instead.
  useEffect(() => {
    if (!userEmail) return;
    if (didAutoSendRef.current) return;
    if (provider === "paypal") return; // PayPal uses its own verification flow

    didAutoSendRef.current = true;

    const t = window.setTimeout(() => {
      void handleResendEmail(true);
    }, 800);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, provider]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl dolphy-gradient flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">D</span>
          </div>
          <span className="text-3xl font-bold text-foreground">DolphySN</span>
        </div>

        <div className="bg-card border rounded-xl p-8 text-center shadow-lg">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {checkoutStatus === "success" ? "Payment Successful!" : "Almost There!"}
          </h1>

          <p className="text-muted-foreground mb-6">
            {checkoutStatus === "success"
              ? "Thank you for subscribing to DolphySN Premium!"
              : "Your account has been created successfully."}
          </p>

          {/* PayPal verification status */}
          {provider === "paypal" && isVerifyingPayPal && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Verifying PayPal payment...</span>
            </div>
          )}

          {provider === "paypal" && paypalVerified && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
              <span className="text-sm text-green-700 dark:text-green-300">✓ PayPal payment verified successfully!</span>
            </div>
          )}

          {/* Email verification section */}
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-2">Check Your Email</h2>

            <p className="text-sm text-muted-foreground mb-4">
              We've sent a verification email to{" "}
              <span className="font-medium text-foreground">{userEmail || "your email address"}</span>.
              Click the link in the email to verify your account and access all features.
            </p>

            <div className="text-xs text-muted-foreground">
              <p>Didn't receive the email? Check your spam/promotions folder or</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => handleResendEmail(false)}
              variant="outline"
              className="w-full gap-2"
              disabled={isResending || isVerifyingPayPal}
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>

            <Button onClick={() => navigate("/login")} className="dolphy-gradient text-white w-full">
              Go to Login
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            After verifying your email, you'll have full access to DolphySN.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
