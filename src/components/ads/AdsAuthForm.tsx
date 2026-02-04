import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, User, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface AdsAuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const AdsAuthForm = ({ onSuccess, onBack }: AdsAuthFormProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    try {
      const validated = signupSchema.parse(formData);
      setIsLoading(true);

      // Check if email already exists
      const { data: existsData } = await supabase.functions.invoke("check-email-exists", {
        body: { email: validated.email },
      });

      if (existsData?.exists) {
        toast.error("An account with this email already exists. Please log in.");
        setMode("login");
        return;
      }

      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            display_name: validated.name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with name
        await supabase.from("profiles").update({
          display_name: validated.name,
          first_name: validated.name.split(" ")[0],
          last_name: validated.name.split(" ").slice(1).join(" ") || "",
        }).eq("user_id", data.user.id);

        // Send email verification
        await supabase.functions.invoke("send-signup-confirmation", {
          body: {
            email: validated.email,
            name: validated.name,
            userId: data.user.id,
          },
        });

        setVerificationEmail(validated.email);
        setShowVerification(true);
        toast.success("Account created! Please check your email to verify.");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Signup failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const validated = loginSchema.parse(formData);
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if email is verified
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("user_id", data.user.id)
          .single();

        if (!profile?.email_verified) {
          toast.info("Please verify your email to continue");
          setVerificationEmail(validated.email);
          setShowVerification(true);

          // Resend verification email
          await supabase.functions.invoke("send-signup-confirmation", {
            body: {
              email: validated.email,
              userId: data.user.id,
            },
          });
          return;
        }

        toast.success("Welcome back!");
        onSuccess();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.functions.invoke("send-signup-confirmation", {
        body: {
          email: verificationEmail,
          userId: user?.id,
        },
      });
      toast.success("Verification email sent!");
    } catch {
      toast.error("Failed to resend verification email");
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerification) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to <strong>{verificationEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Please check your inbox and click the verification link to continue.
            Once verified, you can proceed with creating your ad campaign.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Resend Verification Email
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => {
                setShowVerification(false);
                setMode("login");
              }}
            >
              Already verified? Log in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-fit -ml-2 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <CardTitle>Ads Manager Account</CardTitle>
        <CardDescription>
          {mode === "signup" 
            ? "Create an account to manage your ad campaigns"
            : "Log in to access your campaigns"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Log In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="John Doe"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Min 6 characters"
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Account
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Email verification is required to access your campaigns
            </p>
          </TabsContent>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Your password"
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Log In
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
