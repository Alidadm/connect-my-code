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
  const [userId, setUserId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isVerifyingPayPal, setIsVerifyingPayPal] = useState(false);
  const [paypalVerified, setPaypalVerified] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const checkoutStatus = searchParams.get("checkout");
  const provider = searchParams.get("provider");

  const didAutoSendRef = useRef(false);
  const didPayPalVerifyRef = useRef(false);

  // Wait for session to be ready after redirect
  useEffect(() => {
    const checkSession = async () => {
      // Give the session a moment to restore after redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserEmail(session.user.email || null);
        setUserId(session.user.id);
        setSessionReady(true);
        console.log("Session ready:", session.user.id);
      } else {
        // Try getUser as fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          setUserId(user.id);
          setSessionReady(true);
          console.log("User ready via getUser:", user.id);
        } else {
          console.log("No session found, user may need to log in");
          setSessionReady(true); // Still mark as ready so UI shows
        }
      }
    };
    
    checkSession();
  }, []);

  // Verify PayPal subscription and send email when session is ready
  useEffect(() => {
    if (!sessionReady || didPayPalVerifyRef.current) return;
    if (checkoutStatus !== "success") return;
    
    didPayPalVerifyRef.current = true;
    const isPayPal = provider === "paypal";

    const verifyAndSendEmail = async () => {
      if (isPayPal) {
        setIsVerifyingPayPal(true);
      }
      
      try {
        // If PayPal, try to verify the subscription first
        if (isPayPal && userId) {
          console.log("Attempting PayPal subscription verification...");
          const { data, error } = await supabase.functions.invoke("verify-paypal-subscription");
          
          if (!error && data?.verified) {
            setPaypalVerified(true);
            toast.success("Payment verified! Check your email for verification link.");
            setIsVerifyingPayPal(false);
            return; // Email was sent by the edge function
          } else {
            console.log("PayPal verification result:", data, error);
          }
        }
        
        // Fallback: Send confirmation email directly
        if (userEmail && userId) {
          console.log("Sending confirmation email directly...");
          
          // Get user's profile for name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, first_name, last_name")
            .eq("user_id", userId)
            .single();

          const userName =
            profile?.display_name ||
            `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
            "Member";

          const { error } = await supabase.functions.invoke("send-signup-confirmation", {
            body: {
              email: userEmail,
              name: userName,
              userId: userId,
            },
          });

          if (!error) {
            console.log("Confirmation email sent successfully");
            if (isPayPal) {
              toast.success("Verification email sent! Check your inbox.");
            }
          } else {
            console.error("Failed to send confirmation email:", error);
          }
        }
      } catch (err) {
        console.error("Failed to verify/send email:", err);
      } finally {
        setIsVerifyingPayPal(false);
      }
    };

    // Small delay to ensure everything is ready
    const t = window.setTimeout(verifyAndSendEmail, 1000);
    return () => window.clearTimeout(t);
  }, [sessionReady, checkoutStatus, provider, userId, userEmail]);

  const handleResendEmail = async (silent = false) => {
    if (!userEmail || !userId) {
      if (!silent) toast.error("Unable to resend email. Please try again later.");
      return;
    }

    setIsResending(true);
    try {
      // Get user's profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", userId)
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
          userId: userId,
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
              disabled={isResending || isVerifyingPayPal || !sessionReady}
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
