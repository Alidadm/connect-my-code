import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Step = "email" | "verify";

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("forgot-password-send-code", {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) throw error;

      toast({
        title: "Code sent!",
        description: "Check your email for the verification code.",
      });

      setStep("verify");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("forgot-password-verify-code", {
        body: { email: email.toLowerCase().trim(), code },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Verification failed",
          description: data.error || "Invalid code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Code verified!",
        description: "You can now create a new password.",
      });

      // Navigate to reset password page with the token
      navigate(`/reset-password?token=${data.resetToken}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("forgot-password-send-code", {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) throw error;

      toast({
        title: "Code resent!",
        description: "Check your email for the new verification code.",
      });
      setCode("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 dolphy-gradient items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-md">
          <h2 className="text-4xl font-bold mb-4">Reset Your Password</h2>
          <p className="text-lg opacity-90">
            Don't worry, it happens to the best of us. We'll help you get back into your account.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <div className="w-10 h-10 rounded-xl dolphy-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">D</span>
            </div>
            <span className="text-2xl font-bold text-foreground">DolphySN</span>
          </div>

          {step === "email" && (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Forgot Password</h1>
              <p className="text-muted-foreground mb-6 sm:mb-8">
                Enter your email address and we'll send you a verification code.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full dolphy-gradient hover:opacity-90 transition-opacity" 
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          )}

          {step === "verify" && (
            <>
              <button
                onClick={() => setStep("email")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Enter Verification Code</h1>
              <p className="text-muted-foreground mb-6 sm:mb-8">
                We've sent a 6-digit code to {email}
              </p>

              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  onClick={handleVerifyCode}
                  className="w-full dolphy-gradient hover:opacity-90 transition-opacity" 
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Didn't receive the code? Resend
                  </button>
                </div>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
