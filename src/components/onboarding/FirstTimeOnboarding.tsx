import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Globe, User, Camera, Check } from "lucide-react";
import { supportedLanguages, LanguageCode } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { format, parse } from "date-fns";

interface FirstTimeOnboardingProps {
  onComplete: () => void;
}

export const FirstTimeOnboarding = ({ onComplete }: FirstTimeOnboardingProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { i18n, t } = useTranslation();
  
  const [step, setStep] = useState<"language" | "profile">("language");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
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

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if onboarding is already completed
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, first_name, last_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profileData?.onboarding_completed) {
        onComplete();
        return;
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
            if (privateData.email) setEmail(privateData.email);
            if (privateData.phone) setPhone(privateData.phone);
            if (privateData.birthday) {
              // Format date for input (YYYY-MM-DD)
              const date = new Date(privateData.birthday);
              setBirthday(format(date, "yyyy-MM-dd"));
            }
          }
        } catch (error) {
          console.error("Error fetching private profile:", error);
        }
      }

      // Set email from auth user if not in private profile
      if (!email && user.email) {
        setEmail(user.email);
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
      await i18n.changeLanguage(selectedLanguage);
      
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

      toast.success(t("settings.languageChanged") || "Language saved!");
      setStep("profile");
    } catch (error) {
      console.error("Error saving language:", error);
      toast.error("Failed to save language preference");
    } finally {
      setSaving(false);
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
      toast.error("Please enter your full name");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!birthday) {
      toast.error("Please enter your date of birth");
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
              email: email.trim(),
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
      toast.success("Profile saved successfully!");
      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold">
            {step === "language" ? "🌍 Welcome! Choose Your Language" : "👤 Complete Your Profile"}
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            {step === "language" 
              ? "Select your preferred language to continue" 
              : "Please verify and complete your profile information"}
          </p>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            <div className={`h-1.5 flex-1 rounded-full ${step === "language" ? "bg-primary-foreground" : "bg-primary-foreground/50"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step === "profile" ? "bg-primary-foreground" : "bg-primary-foreground/30"}`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === "language" ? (
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
          ) : (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {firstName?.[0]?.toUpperCase() || lastName?.[0]?.toUpperCase() || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Upload your profile photo</p>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <Label htmlFor="birthday">Date of Birth *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/30 border-t flex justify-end gap-3">
          {step === "language" ? (
            <Button
              onClick={handleLanguageSave}
              disabled={saving}
              className="min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Continue
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleProfileSave}
              disabled={saving}
              className="min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save & Continue
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
