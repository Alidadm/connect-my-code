import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus('error');
        setMessage("No confirmation token provided");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("confirm-email", {
          body: { token }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setStatus('success');
        setMessage("Your email has been verified successfully!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || "Failed to verify email");
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

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
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Verifying Email</h1>
              <p className="text-muted-foreground">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground mb-4">Redirecting to login page...</p>
              <Button onClick={() => navigate("/login")} className="dolphy-gradient text-white">
                Go to Login Now
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={() => navigate("/signup")} variant="outline" className="w-full">
                  Create New Account
                </Button>
                <Button onClick={() => navigate("/login")} className="dolphy-gradient text-white w-full">
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
