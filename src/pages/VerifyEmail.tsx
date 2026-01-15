import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    // Get current user's email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast.error("Unable to resend email. Please try again later.");
      return;
    }

    setIsResending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      // Get user's profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", user.id)
        .single();

      const userName = profile?.display_name || 
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || 
        "Member";

      // Trigger the confirmation email again
      const { error } = await supabase.functions.invoke("send-signup-confirmation", {
        body: {
          email: userEmail,
          name: userName,
          userId: user.id,
        }
      });

      if (error) throw error;
      toast.success("Verification email sent! Check your inbox.");
    } catch (err: any) {
      console.error("Failed to resend email:", err);
      toast.error("Failed to resend email. Please try again later.");
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

          {/* Email verification section */}
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Check Your Email
            </h2>
            
            <p className="text-sm text-muted-foreground mb-4">
              We've sent a verification email to{" "}
              <span className="font-medium text-foreground">
                {userEmail || "your email address"}
              </span>
              . Click the link in the email to verify your account and access all features.
            </p>

            <div className="text-xs text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder or</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleResendEmail} 
              variant="outline" 
              className="w-full gap-2"
              disabled={isResending}
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
            
            <Button 
              onClick={() => navigate("/login")} 
              className="dolphy-gradient text-white w-full"
            >
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