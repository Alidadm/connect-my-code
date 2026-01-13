import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid reset link",
        description: "Please request a new password reset.",
        variant: "destructive",
      });
      navigate("/forgot-password");
    }
  }, [token, navigate]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return { minLength, hasUppercase, hasSymbol, isValid: minLength && hasUppercase && hasSymbol };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters with one uppercase letter and one symbol.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("forgot-password-reset", {
        body: { 
          resetToken: token,
          newPassword: formData.password 
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Reset failed",
          description: data.error || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Password reset!",
        description: "Your password has been successfully updated.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Password Reset Complete!</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully updated. Redirecting you to login...
          </p>
          <Link to="/login">
            <Button className="weshare-gradient hover:opacity-90 transition-opacity">
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 weshare-gradient items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-md">
          <h2 className="text-4xl font-bold mb-4">Create New Password</h2>
          <p className="text-lg opacity-90">
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <div className="w-10 h-10 rounded-xl weshare-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">W</span>
            </div>
            <span className="text-2xl font-bold text-foreground">WeShare</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Create New Password</h1>
          <p className="text-muted-foreground mb-6 sm:mb-8">
            Enter your new password below.
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password requirements */}
              <div className="text-xs space-y-1 mt-2">
                <p className={passwordValidation.minLength ? "text-green-600" : "text-muted-foreground"}>
                  ✓ At least 8 characters
                </p>
                <p className={passwordValidation.hasUppercase ? "text-green-600" : "text-muted-foreground"}>
                  ✓ One uppercase letter
                </p>
                <p className={passwordValidation.hasSymbol ? "text-green-600" : "text-muted-foreground"}>
                  ✓ One symbol (!@#$%^&* etc.)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full weshare-gradient hover:opacity-90 transition-opacity" 
              disabled={isLoading || !passwordValidation.isValid}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

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

export default ResetPassword;
