import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Globe, User, Camera, Check, Mail, RefreshCw } from "lucide-react";
import { supportedLanguages, LanguageCode } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface FirstTimeOnboardingProps {
  onComplete: () => void;
}

export const FirstTimeOnboarding = ({ onComplete }: FirstTimeOnboardingProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { i18n, t } = useTranslation();
  
  const [step, setStep] = useState<"language" | "email" | "profile">("language");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Email verification
  const [emailToVerify, setEmailToVerify] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Profile form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if onboarding is already completed
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, first_name, last_name, avatar_url, email_verified")
        .eq("user_id", user.id)
        .single();

      if (profileData?.onboarding_completed) {
        onComplete();
        return;
      }

      // Check if email is already verified
      if (profileData?.email_verified) {
        setEmailVerified(true);
      }

      // Load existing profile data
      if (profileData) {
        setFirstName(profileData.first_name || "");
        setLastName(profileData.last_name || "");
        setAvatarUrl(profileData.avatar_url);
      }

      // Load private profile data (email, phone, birthday)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-my-private-profile`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const privateData = await response.json();
            if (privateData.email) {
              setEmail(privateData.email);
              setEmailToVerify(privateData.email);
            }
            if (privateData.phone) {
              setPhone(privateData.phone);
            }
            if (privateData.birthday) {
              // Use parseISO to avoid timezone shifts with date-only strings
              const date = parseISO(privateData.birthday);
              setBirthday(format(date, "yyyy-MM-dd"));
            }
          }
        } catch (error) {
          console.error("Error fetching private profile:", error);
        }
      }

      // Set email from auth user if not in private profile
      if (!emailToVerify && user.email) {
        setEmail(user.email);
        setEmailToVerify(user.email);
      }

      // Get current language
      const currentLang = supportedLanguages.find(l => l.code === i18n.language)?.code || "en";
      setSelectedLanguage(currentLang as LanguageCode);

      setLoading(false);
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setLoading(false);
    }
  };

  const handleLanguageSave = async () => {
    setSaving(true);
    try {
      // Change language and wait for it to fully load
      await i18n.changeLanguage(selectedLanguage);
      
      // Force a small delay to ensure translations are loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save language preference to user settings
      if (user) {
        const { data: existing } = await supabase
          .from("user_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_settings")
            .update({ language: selectedLanguage, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_settings")
            .insert({ user_id: user.id, language: selectedLanguage });
        }
      }

      // Get the language name for toast
      const langName = supportedLanguages.find(l => l.code === selectedLanguage)?.nativeName || selectedLanguage;
      toast.success(`Language changed to ${langName}`);
      
      // If email already verified, skip to profile
      if (emailVerified) {
        setStep("profile");
      } else {
        setStep("email");
      }
    } catch (error) {
      console.error("Error saving language:", error);
      toast.error("Failed to save language preference");
    } finally {
      setSaving(false);
    }
  };

  const handleSendCode = async () => {
    if (!emailToVerify || !emailToVerify.includes("@")) {
      toast.error(t("onboarding.enterValidEmail", "Please enter a valid email address"));
      return;
    }

    setSendingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-verification-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: emailToVerify }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("onboarding.codeSendFailed", "Failed to send code"));
      }

      setCodeSent(true);
      setResendCooldown(60);
      toast.success(t("onboarding.codeSentToEmail", "Verification code sent to your email!"));
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast.error(error.message || t("onboarding.codeSendFailed", "Failed to send verification code"));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t("onboarding.enterCode", "Please enter the 6-digit code"));
      return;
    }

    setVerifyingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            code: verificationCode,
            email: emailToVerify 
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("onboarding.codeInvalid", "Invalid verification code"));
      }

      setEmailVerified(true);
      setEmail(emailToVerify);
      toast.success(t("onboarding.emailVerified", "Email verified successfully!"));
      setStep("profile");
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || t("onboarding.codeInvalid", "Invalid or expired code"));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;

    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("onboarding.enterFullName", "Please enter your full name"));
      return;
    }

    if (!birthday) {
      toast.error(t("onboarding.enterBirthday", "Please enter your date of birth"));
      return;
    }

    setSaving(true);
    try {
      // Update public profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          avatar_url: avatarUrl,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update private profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-private-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: email.trim() || emailToVerify.trim(),
              phone: phone.trim() || null,
              birthday: birthday,
            }),
          }
        );

        if (!response.ok) {
          console.error("Error saving private profile");
        }
      }

      await refreshProfile();
      toast.success(t("onboarding.profileSaved", "Profile saved successfully!"));
      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t("onboarding.profileSaveFailed", "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStepNumber = () => {
    if (step === "language") return 1;
    if (step === "email") return 2;
    return 3;
  };

  const totalSteps = emailVerified ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold">
            {step === "language" && `🌍 ${t("onboarding.welcomeLanguage", "Welcome! Choose Your Language")}`}
            {step === "email" && `📧 ${t("onboarding.verifyEmail", "Verify Your Email")}`}
            {step === "profile" && `👤 ${t("onboarding.completeProfile", "Complete Your Profile")}`}
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            {step === "language" && t("onboarding.selectLanguage", "Select your preferred language to continue")}
            {step === "email" && t("onboarding.emailCodeDesc", "We'll send a verification code to your email")}
            {step === "profile" && t("onboarding.verifyProfileDesc", "Please verify and complete your profile information")}
          </p>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx < getStepNumber() ? "bg-primary-foreground" : "bg-primary-foreground/30"
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === "language" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code as LanguageCode)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      selectedLanguage === lang.code
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/24x18/${lang.flag}.png`}
                      alt={lang.name}
                      className="w-6 h-4 object-cover rounded"
                    />
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">{lang.nativeName}</p>
                      <p className="text-xs text-muted-foreground">{lang.name}</p>
                    </div>
                    {selectedLanguage === lang.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "email" && (
            <div className="space-y-6">
              {!codeSent ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("onboarding.emailCodeDesc", "We'll send a 6-digit verification code to your email address.")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailVerify">{t("onboarding.emailAddress", "Email Address")}</Label>
                    <Input
                      id="emailVerify"
                      type="email"
                      value={emailToVerify}
                      onChange={(e) => setEmailToVerify(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <Button
                    onClick={handleSendCode}
                    disabled={sendingCode || !emailToVerify}
                    className="w-full"
                  >
                    {sendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("onboarding.sending", "Sending...")}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t("onboarding.sendCode", "Send Verification Code")}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("onboarding.codeSentTo", "Code sent to")} <strong>{emailToVerify}</strong>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-center block">{t("onboarding.enterVerificationCode", "Enter Verification Code")}</Label>
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={verificationCode}
                        onChange={setVerificationCode}
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
                  </div>

                  <Button
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {verifyingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("onboarding.verifying", "Verifying...")}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t("onboarding.verifyCode", "Verify Code")}
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSendCode}
                      disabled={resendCooldown > 0 || sendingCode}
                    >
                      {resendCooldown > 0 ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t("onboarding.resendIn", "Resend in")} {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t("onboarding.resendCode", "Resend Code")}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {firstName?.[0]?.toUpperCase() || <User className="h-10 w-10" />}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.uploadPhoto", "Upload a profile photo")}
                </p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("onboarding.firstName", "First Name")} *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("onboarding.lastName", "Last Name")} *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("onboarding.email", "Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email || emailToVerify}
                  disabled
                  className="bg-muted"
                />
                {emailVerified && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> {t("onboarding.verified", "Verified")}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t("onboarding.phone", "Phone Number")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <Label htmlFor="birthday">{t("onboarding.birthday", "Date of Birth")} *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/50 border-t">
          {step === "language" && (
            <Button onClick={handleLanguageSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("onboarding.saving", "Saving...")}
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  {t("onboarding.continue", "Continue")}
                </>
              )}
            </Button>
          )}

          {step === "profile" && (
            <Button onClick={handleProfileSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("onboarding.saving", "Saving...")}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("onboarding.saveAndContinue", "Save & Continue")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
