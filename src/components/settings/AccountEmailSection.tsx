import { useState, useEffect } from "react";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const AccountEmailSection = () => {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(true);

  useEffect(() => {
    const fetchEmail = async () => {
      if (!user) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke("get-my-private-profile", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        
        if (data?.email) {
          setCurrentEmail(data.email);
        } else if (user.email) {
          setCurrentEmail(user.email);
        }
      } catch (error) {
        console.error("Error fetching email:", error);
        // Fallback to auth user email
        if (user.email) {
          setCurrentEmail(user.email);
        }
      } finally {
        setLoadingEmail(false);
      }
    };

    fetchEmail();
  }, [user]);

  const handleSendCode = async () => {
    if (!newEmail || newEmail === currentEmail) {
      toast({
        title: t("settings.emailSameError", { defaultValue: "Same Email" }),
        description: t("settings.emailSameErrorDesc", { defaultValue: "Please enter a different email address." }),
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: t("settings.invalidEmail", { defaultValue: "Invalid Email" }),
        description: t("settings.invalidEmailDesc", { defaultValue: "Please enter a valid email address." }),
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("send-email-change-code", {
        body: { newEmail },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShowOtpInput(true);
      toast({
        title: t("settings.codeSent", { defaultValue: "Code Sent" }),
        description: t("settings.codeSentDesc", { defaultValue: "A verification code has been sent to your new email." }),
      });
    } catch (error: any) {
      toast({
        title: t("common.error", { defaultValue: "Error" }),
        description: error.message || t("settings.sendCodeError", { defaultValue: "Failed to send verification code." }),
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: t("settings.invalidCode", { defaultValue: "Invalid Code" }),
        description: t("settings.invalidCodeDesc", { defaultValue: "Please enter a 6-digit code." }),
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("verify-email-change-code", {
        body: { code: otpCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCurrentEmail(data.newEmail);
      setIsEditing(false);
      setShowOtpInput(false);
      setNewEmail("");
      setOtpCode("");
      await refreshProfile();

      toast({
        title: t("settings.emailUpdated", { defaultValue: "Email Updated" }),
        description: t("settings.emailUpdatedDesc", { defaultValue: "Your email has been successfully updated." }),
      });
    } catch (error: any) {
      toast({
        title: t("common.error", { defaultValue: "Error" }),
        description: error.message || t("settings.verifyCodeError", { defaultValue: "Failed to verify code." }),
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowOtpInput(false);
    setNewEmail("");
    setOtpCode("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t("settings.account", { defaultValue: "Account" })}
        </CardTitle>
        <CardDescription>
          {t("settings.accountDesc", { defaultValue: "Manage your account email address" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("settings.currentEmail", { defaultValue: "Current Email" })}</Label>
          {loadingEmail ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("common.loading", { defaultValue: "Loading..." })}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md flex-1">
                {currentEmail || t("settings.noEmail", { defaultValue: "No email set" })}
              </p>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  {t("common.change", { defaultValue: "Change" })}
                </Button>
              )}
            </div>
          )}
        </div>

        {isEditing && !showOtpInput && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">{t("settings.newEmail", { defaultValue: "New Email Address" })}</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder={t("settings.enterNewEmail", { defaultValue: "Enter new email address" })}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendCode} disabled={isSendingCode || !newEmail}>
                {isSendingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("settings.sendCode", { defaultValue: "Send Verification Code" })}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
            </div>
          </div>
        )}

        {showOtpInput && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-md border border-border">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-foreground">
                <p>{t("settings.codeInfo", { defaultValue: "A 6-digit code has been sent to:" })}</p>
                <p className="font-medium">{newEmail}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.verificationCode", { defaultValue: "Verification Code" })}</Label>
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
            <div className="flex gap-2">
              <Button onClick={handleVerifyCode} disabled={isVerifying || otpCode.length !== 6}>
                {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Check className="w-4 h-4 mr-2" />
                {t("settings.verifyAndUpdate", { defaultValue: "Verify & Update Email" })}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
