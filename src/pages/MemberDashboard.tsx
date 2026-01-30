import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  User, Settings, Bell, Shield, Palette, Layout, Camera, Save,
  ChevronRight, Eye, EyeOff, Lock, Mail, Phone, Globe, Calendar,
  Home, CreditCard, Users, Heart, MessageCircle, LogOut, Clock,
  CheckCircle2, XCircle, Loader2, ExternalLink, Languages, UsersRound,
  Building2, Info, AlertTriangle, RotateCcw, Menu, X, Youtube, Images, Newspaper
} from "lucide-react";
import { format, isValid as isValidDate, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { GroupsManagement } from "@/components/dashboard/GroupsManagement";
import { BusinessManagement } from "@/components/business/BusinessManagement";
import { AboutSettings } from "@/components/settings/AboutSettings";
import { RecentlyWatchedSection } from "@/components/dashboard/RecentlyWatchedSection";

import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { CoverEditor } from "@/components/cover/CoverEditor";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputField } from "@/components/ui/phone-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateUsername } from "@/lib/username";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPhoneNumberIntl, isValidPhoneNumber } from "react-phone-number-input";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabType = "profile" | "account" | "about" | "privacy" | "notifications" | "appearance" | "groups" | "business" | "watch-history";

// Country code to name mapping
const countryNames: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", JP: "Japan",
  CN: "China", IN: "India", BR: "Brazil", MX: "Mexico", NL: "Netherlands",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  RU: "Russia", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  NZ: "New Zealand", IE: "Ireland", CH: "Switzerland", AT: "Austria",
  BE: "Belgium", PT: "Portugal", GR: "Greece", CZ: "Czech Republic",
  HU: "Hungary", RO: "Romania", UA: "Ukraine", ZA: "South Africa",
  AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", VE: "Venezuela",
  PH: "Philippines", TH: "Thailand", MY: "Malaysia", ID: "Indonesia",
  VN: "Vietnam", PK: "Pakistan", BD: "Bangladesh", EG: "Egypt", NG: "Nigeria",
  KE: "Kenya", GH: "Ghana", MA: "Morocco", SA: "Saudi Arabia", AE: "UAE",
  IL: "Israel", TR: "Turkey", TW: "Taiwan",
};

// Menu items with translation keys
const getMenuItems = (t: (key: string) => string) => [
  { id: "profile" as TabType, label: t("profile.title"), icon: User, description: t("profile.description") },
  { id: "account" as TabType, label: t("account.title"), icon: Settings, description: t("account.description") },
  { id: "about" as TabType, label: t("profile.about"), icon: Info, description: t("dashboard.aboutDescription") },
  { id: "business" as TabType, label: t("dashboard.business"), icon: Building2, description: t("dashboard.businessDescription") },
  { id: "groups" as TabType, label: t("nav.groups"), icon: UsersRound, description: t("groups.manageGroups") },
  { id: "watch-history" as TabType, label: t("dashboard.watchHistory") || "Watch History", icon: Youtube, description: t("dashboard.watchHistoryDescription") || "Videos you've watched" },
  { id: "privacy" as TabType, label: t("privacy.title"), icon: Shield, description: t("privacy.description") },
  { id: "notifications" as TabType, label: t("notifications.title"), icon: Bell, description: t("notifications.description") },
  { id: "appearance" as TabType, label: t("appearance.title"), icon: Palette, description: t("appearance.description") },
];

const getQuickLinks = (t: (key: string) => string) => [
  { label: t("common.home"), icon: Home, path: "/" },
  { label: t("nav.templates") || "Templates", icon: Palette, path: "/templates" },
  { label: t("dashboard.commissions"), icon: CreditCard, path: "/commissions" },
  { label: t("dashboard.referralNetwork") || "Referral Network", icon: Users, path: "/commissions#referral-network" },
];

const MemberDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Private profile data (email, phone, birthday)
  const [privateProfile, setPrivateProfile] = useState<{
    email: string | null;
    phone: string | null;
    birthday: string | null;
  } | null>(null);
  
  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    error: string | null;
  }>({ checking: false, available: null, error: null });
  
  // Profile form state
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    location: profile?.location || "",
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
  });

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    messageNotifications: true,
    friendRequestNotifications: true,
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessages: true,
    darkMode: false,
    compactMode: false,
  });

  // Widget visibility state
  const [platformGalleryVisible, setPlatformGalleryVisible] = useState(() => {
    return localStorage.getItem("platformGalleryHidden") !== "true";
  });
  const [newsWidgetVisible, setNewsWidgetVisible] = useState(() => {
    return localStorage.getItem("newsWidgetHidden") !== "true";
  });

  // Pending join requests count for groups badge
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Account tab editing state (moved to top level for hooks rules)
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthday, setNewBirthday] = useState("");
  const [updatingBirthday, setUpdatingBirthday] = useState(false);

  // Phone verification state
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<"idle" | "code">("idle");
  const [phoneVerifyCode, setPhoneVerifyCode] = useState("");
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  // Email verification state
  const [emailVerifyStep, setEmailVerifyStep] = useState<"idle" | "code">("idle");
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  // Cooldown timer for phone resend
  React.useEffect(() => {
    if (phoneResendCooldown > 0) {
      const timer = setTimeout(() => setPhoneResendCooldown(phoneResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneResendCooldown]);

  // Cooldown timer for email resend
  React.useEffect(() => {
    if (emailResendCooldown > 0) {
      const timer = setTimeout(() => setEmailResendCooldown(emailResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailResendCooldown]);
  
  // Avatar editor state
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  
  // Cover editor state
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);

  // Track if profile form has unsaved changes
  const hasUnsavedProfileChanges = useMemo(() => {
    if (!profile) return false;
    return (
      formData.display_name !== (profile.display_name || "") ||
      formData.username !== (profile.username || "") ||
      formData.bio !== (profile.bio || "") ||
      formData.location !== (profile.location || "") ||
      formData.first_name !== (profile.first_name || "") ||
      formData.last_name !== (profile.last_name || "")
    );
  }, [formData, profile]);

  // Use the unsaved changes hook for navigation blocking
  const { isBlocked, proceed, reset } = useUnsavedChanges({
    hasUnsavedChanges: hasUnsavedProfileChanges && activeTab === "profile",
    message: "You have unsaved profile changes. Are you sure you want to leave?",
  });

  // Fetch pending join requests count
  React.useEffect(() => {
    const fetchPendingRequestsCount = async () => {
      if (!user) return;
      try {
        // Get groups where user is admin/moderator
        const { data: adminGroups, error: adminError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id)
          .in("role", ["admin", "moderator"]);

        if (adminError || !adminGroups || adminGroups.length === 0) {
          setPendingRequestsCount(0);
          return;
        }

        const groupIds = adminGroups.map(g => g.group_id);

        // Count pending requests
        const { count, error } = await supabase
          .from("group_join_requests")
          .select("id", { count: "exact", head: true })
          .in("group_id", groupIds)
          .eq("status", "pending");

        if (!error) {
          setPendingRequestsCount(count || 0);
        }
      } catch (err) {
        console.error("Error fetching pending requests count:", err);
      }
    };
    fetchPendingRequestsCount();
  }, [user]);

  // Fetch private profile data
  React.useEffect(() => {
    const fetchPrivateProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('get-my-private-profile');
        if (!error && data) {
          setPrivateProfile(data);
        }
      } catch (err) {
        console.error("Error fetching private profile:", err);
      }
    };
    fetchPrivateProfile();
  }, [user]);

  const normalizePhoneForStorage = useCallback((phone: string) => {
    const trimmed = (phone || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("+")) return trimmed;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return trimmed;
  }, []);

  const formatPhoneDisplay = useCallback((phone: string | null) => {
    if (!phone) return "Not set";
    const normalized = normalizePhoneForStorage(phone);
    if (normalized.startsWith("+") && isValidPhoneNumber(normalized)) {
      return formatPhoneNumberIntl(normalized);
    }
    return phone;
  }, [normalizePhoneForStorage]);

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
      });
    }
  }, [profile]);

  // Check username availability with debounce
  const checkUsernameAvailability = useCallback(async (username: string) => {
    // Don't check if it's the same as current username
    if (username.toLowerCase() === profile?.username?.toLowerCase()) {
      setUsernameStatus({ checking: false, available: true, error: null });
      return;
    }

    // Validate format first
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameStatus({ checking: false, available: false, error: validation.error || null });
      return;
    }

    setUsernameStatus({ checking: true, available: null, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('check-username-exists', {
        body: { username: username.toLowerCase(), exclude_user_id: user?.id }
      });

      if (error) {
        setUsernameStatus({ checking: false, available: null, error: "Failed to check availability" });
        return;
      }

      setUsernameStatus({ 
        checking: false, 
        available: data?.available ?? false, 
        error: data?.available ? null : "Username is already taken" 
      });
    } catch (err) {
      setUsernameStatus({ checking: false, available: null, error: "Failed to check availability" });
    }
  }, [profile?.username, user?.id]);

  // Debounced username change handler
  const handleUsernameChange = useCallback((value: string) => {
    const lowercaseValue = value.toLowerCase().replace(/[^a-z0-9.]/g, '');
    setFormData(prev => ({ ...prev, username: lowercaseValue }));
    
    // Clear status if empty
    if (!lowercaseValue) {
      setUsernameStatus({ checking: false, available: null, error: null });
      return;
    }

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(lowercaseValue);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [checkUsernameAvailability]);

  // Discard changes and reset form to original profile values
  const handleDiscardChanges = useCallback(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
      });
      setUsernameStatus({ checking: false, available: null, error: null });
      toast.info("Changes discarded");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Validate username before saving
    if (formData.username && formData.username !== profile?.username) {
      const validation = validateUsername(formData.username);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid username");
        return;
      }
      
      if (usernameStatus.available === false) {
        toast.error("Username is not available");
        return;
      }
    }
    
    setSaving(true);
    try {
      // Check if username is being changed
      const isUsernameChanging = formData.username.toLowerCase() !== profile?.username?.toLowerCase();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.display_name,
          username: formData.username.toLowerCase(),
          bio: formData.bio,
          location: formData.location,
          first_name: formData.first_name,
          last_name: formData.last_name,
          updated_at: new Date().toISOString(),
          // Mark username as changed if it's being updated
          ...(isUsernameChanging && { username_changed: true }),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Unsaved Changes Indicator */}
      {hasUnsavedProfileChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{t("dashboard.unsavedChanges")}</span>
        </div>
      )}
      
      {/* Member Since Info */}
      <div className="pb-4 border-b border-border">
        <p className="text-sm text-muted-foreground">{t("profile.memberSince")} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t("profile.firstName")}</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="John"
            className="border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{t("profile.lastName")}</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Doe"
            className="border-slate-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">{t("profile.displayName")}</Label>
        <Input
          id="display_name"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder={t("dashboard.yourDisplayName")}
          className="border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">{t("profile.username")}</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="username"
            disabled={profile?.username_changed === true}
            className={cn(
              "pl-8 pr-10 border-slate-200",
              usernameStatus.available === true && "border-emerald-500 focus-visible:ring-emerald-500",
              usernameStatus.available === false && "border-red-500 focus-visible:ring-red-500",
              profile?.username_changed === true && "bg-slate-100 cursor-not-allowed"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus.checking && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}
            {!usernameStatus.checking && usernameStatus.available === true && !profile?.username_changed && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            {!usernameStatus.checking && usernameStatus.available === false && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            {profile?.username_changed === true && (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
        {usernameStatus.error && (
          <p className="text-xs text-red-500">{usernameStatus.error}</p>
        )}
        {usernameStatus.available === true && formData.username !== profile?.username && !profile?.username_changed && (
          <p className="text-xs text-emerald-600">{t("profile.usernameAvailable")}</p>
        )}
        {profile?.username_changed === true ? (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {t("profile.usernameChanged")}
          </p>
        ) : (
          <p className="text-xs text-amber-600">
            ⚠️ {t("profile.usernameWarning")}
          </p>
        )}
        <p className="text-xs text-slate-400">
          {t("profile.profileUrl")}: dolphysn.com/{formData.username || "username"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">{t("profile.bio")}</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder={t("dashboard.bioPlaceholder")}
          className="border-slate-200 min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t("profile.location")}</Label>
        <div className="relative">
          {profile?.country && countryNames[profile.country] && (
            <img 
              src={`https://flagcdn.com/w20/${profile.country.toLowerCase()}.png`}
              alt={countryNames[profile.country]}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-auto rounded-sm"
            />
          )}
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder={t("dashboard.city")}
            className={profile?.country && countryNames[profile.country] ? "pl-10 border-slate-200" : "border-slate-200"}
          />
        </div>
        <p className="text-xs text-slate-400">{t("profile.enterCity")}</p>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={handleSaveProfile} 
          disabled={saving}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? t("common.saving") : t("profile.saveChanges")}
        </Button>
        
        {hasUnsavedProfileChanges && (
          <Button 
            variant="outline"
            onClick={handleDiscardChanges}
            disabled={saving}
            className="border-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("dashboard.discardChanges")}
          </Button>
        )}
      </div>
    </div>
  );

  const renderAccountTab = () => {
    // Step 1: Send code to new email for email change
    const handleSendEmailCode = async () => {
      if (!newEmail || newEmail === (privateProfile?.email || user?.email)) {
        setEditingEmail(false);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        toast.error("Please enter a valid email address");
        return;
      }

      setSendingEmailCode(true);
      try {
        const { error } = await supabase.functions.invoke('send-email-change-code', {
          body: { newEmail: newEmail.toLowerCase() }
        });
        if (error) throw error;

        setEmailCodeSent(true);
        setEmailVerifyStep("code");
        setEmailResendCooldown(60);
        toast.success("Verification code sent to your new email!");
      } catch (error: any) {
        console.error("Error sending email code:", error);
        toast.error(error.message || "Failed to send verification code");
      } finally {
        setSendingEmailCode(false);
      }
    };

    // Step 2: Verify the OTP and update email
    const handleVerifyEmailCode = async () => {
      if (emailVerifyCode.length !== 6) {
        toast.error("Please enter the 6-digit code");
        return;
      }
      setVerifyingEmailCode(true);
      try {
        const { data, error } = await supabase.functions.invoke('verify-email-change-code', {
          body: { code: emailVerifyCode }
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Verification failed");

        // Refresh private profile
        const { data: refreshed } = await supabase.functions.invoke('get-my-private-profile');
        setPrivateProfile(refreshed ?? null);

        toast.success("Email address updated and verified!");
        setEditingEmail(false);
        setEmailVerifyStep("idle");
        setEmailVerifyCode("");
        setEmailCodeSent(false);
        await refreshProfile();
      } catch (error: any) {
        console.error("Error verifying email code:", error);
        toast.error(error.message || "Invalid or expired code");
      } finally {
        setVerifyingEmailCode(false);
      }
    };

    const handleCancelEmailEdit = () => {
      setEditingEmail(false);
      setEmailVerifyStep("idle");
      setEmailVerifyCode("");
      setEmailCodeSent(false);
    };

    // Step 1: Send code to email for phone change
    const handleSendPhoneCode = async () => {
      const normalized = normalizePhoneForStorage(newPhone);
      if (!normalized || normalized === normalizePhoneForStorage(privateProfile?.phone || "")) {
        setEditingPhone(false);
        return;
      }

      if (!normalized.startsWith("+") || !isValidPhoneNumber(normalized)) {
        toast.error("Please enter a valid phone number");
        return;
      }

      setSendingPhoneCode(true);
      try {
        const { error } = await supabase.functions.invoke('send-phone-change-code', {
          body: { newPhone: normalized }
        });
        if (error) throw error;

        setPhoneCodeSent(true);
        setPhoneVerifyStep("code");
        setPhoneResendCooldown(60);
        toast.success("Verification code sent to your email!");
      } catch (error: any) {
        console.error("Error sending phone code:", error);
        toast.error(error.message || "Failed to send verification code");
      } finally {
        setSendingPhoneCode(false);
      }
    };

    // Step 2: Verify the OTP and update phone
    const handleVerifyPhoneCode = async () => {
      if (phoneVerifyCode.length !== 6) {
        toast.error("Please enter the 6-digit code");
        return;
      }
      setVerifyingPhoneCode(true);
      try {
        const { data, error } = await supabase.functions.invoke('verify-phone-change-code', {
          body: { code: phoneVerifyCode }
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Verification failed");

        // Refresh private profile
        const { data: refreshed } = await supabase.functions.invoke('get-my-private-profile');
        setPrivateProfile(refreshed ?? null);

        toast.success("Phone number updated and verified!");
        setEditingPhone(false);
        setPhoneVerifyStep("idle");
        setPhoneVerifyCode("");
        setPhoneCodeSent(false);
        await refreshProfile();
      } catch (error: any) {
        console.error("Error verifying phone code:", error);
        toast.error(error.message || "Invalid or expired code");
      } finally {
        setVerifyingPhoneCode(false);
      }
    };

    const handleCancelPhoneEdit = () => {
      setEditingPhone(false);
      setPhoneVerifyStep("idle");
      setPhoneVerifyCode("");
      setPhoneCodeSent(false);
    };

    const handleUpdateBirthday = async () => {
      if (!newBirthday || newBirthday === privateProfile?.birthday) {
        setEditingBirthday(false);
        return;
      }
      setUpdatingBirthday(true);
      try {
        const { error } = await supabase.functions.invoke('store-private-profile', {
          body: { birthday: newBirthday }
        });
        if (error) throw error;
        
        const { data: refreshed, error: refreshError } = await supabase.functions.invoke('get-my-private-profile');
        if (refreshError) throw refreshError;
        setPrivateProfile(refreshed ?? null);
        
        toast.success("Birthday updated successfully!");
        setEditingBirthday(false);
      } catch (error) {
        console.error("Error updating birthday:", error);
        toast.error("Failed to update birthday");
      } finally {
        setUpdatingBirthday(false);
      }
    };

    const formatBirthdayDisplay = (birthday: string | null) => {
      if (!birthday) return "Not set";
      try {
        // Avoid timezone shifting ("YYYY-MM-DD" is a date-only value)
        const parsed = parseISO(birthday);
        if (!isValidDate(parsed)) return birthday;
        return format(parsed, "MMMM d, yyyy");
      } catch {
        return birthday;
      }
    };

    const handleChangePassword = async () => {
      const { value: formValues } = await Swal.fire({
        title: 'Change Password',
        html: `
          <div style="text-align: left; margin-bottom: 8px;">
            <label style="display: block; font-size: 14px; color: #64748b; margin-bottom: 4px;">Current Password</label>
            <input type="password" id="swal-current-password" class="swal2-input" placeholder="Enter current password" style="margin: 0; width: 100%;">
          </div>
          <div style="text-align: left; margin-bottom: 8px;">
            <label style="display: block; font-size: 14px; color: #64748b; margin-bottom: 4px;">New Password</label>
            <input type="password" id="swal-new-password" class="swal2-input" placeholder="Enter new password" style="margin: 0; width: 100%;">
          </div>
          <div style="text-align: left;">
            <label style="display: block; font-size: 14px; color: #64748b; margin-bottom: 4px;">Confirm Password</label>
            <input type="password" id="swal-confirm-password" class="swal2-input" placeholder="Confirm new password" style="margin: 0; width: 100%;">
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#94a3b8',
        preConfirm: () => {
          const currentPassword = (document.getElementById('swal-current-password') as HTMLInputElement).value;
          const newPassword = (document.getElementById('swal-new-password') as HTMLInputElement).value;
          const confirmPassword = (document.getElementById('swal-confirm-password') as HTMLInputElement).value;
          
          if (!currentPassword || !newPassword || !confirmPassword) {
            Swal.showValidationMessage('Please fill in all fields');
            return false;
          }
          
          if (newPassword.length < 8) {
            Swal.showValidationMessage('New password must be at least 8 characters');
            return false;
          }
          
          if (!/[A-Z]/.test(newPassword)) {
            Swal.showValidationMessage('New password must contain at least one uppercase letter');
            return false;
          }
          
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            Swal.showValidationMessage('New password must contain at least one symbol');
            return false;
          }
          
          if (newPassword !== confirmPassword) {
            Swal.showValidationMessage('Passwords do not match');
            return false;
          }
          
          return { currentPassword, newPassword };
        }
      });

      if (formValues) {
        // Show loading state
        Swal.fire({
          title: 'Updating Password...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          // First, verify current password by re-authenticating
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user?.email || '',
            password: formValues.currentPassword
          });

          if (signInError) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Current password is incorrect',
              confirmButtonColor: '#3b82f6'
            });
            return;
          }

          // Update password
          const { error: updateError } = await supabase.auth.updateUser({
            password: formValues.newPassword
          });

          if (updateError) {
            throw updateError;
          }

          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Your password has been updated successfully.',
            confirmButtonColor: '#3b82f6'
          });
        } catch (error: any) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to update password',
            confirmButtonColor: '#3b82f6'
          });
        }
      }
    };

    const handleDeleteAccount = async () => {
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
      const userPhone = privateProfile?.phone || '';

      // First warning
      const { isConfirmed: firstConfirm } = await Swal.fire({
        icon: 'warning',
        title: 'Delete Your Account?',
        html: `
          <p style="color: #dc2626; margin-bottom: 12px;">This action is <strong>permanent</strong> and cannot be undone.</p>
          <p style="color: #64748b;">You will lose:</p>
          <ul style="text-align: left; color: #64748b; margin: 12px 0;">
            <li>• All your profile data</li>
            <li>• Your posts and comments</li>
            <li>• All subscription funds</li>
            <li>• Pending commissions</li>
            <li>• Friend connections</li>
          </ul>
        `,
        showCancelButton: true,
        confirmButtonText: 'Continue',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#94a3b8',
      });

      if (!firstConfirm) return;

      // Final verification with full name and phone
      const { value: formValues } = await Swal.fire({
        title: 'Final Verification',
        html: `
          <p style="color: #dc2626; margin-bottom: 16px; font-weight: 500;">To confirm deletion, enter your details exactly as registered:</p>
          <div style="text-align: left; margin-bottom: 12px;">
            <label style="display: block; font-size: 14px; color: #64748b; margin-bottom: 4px;">Full Name</label>
            <input type="text" id="swal-full-name" class="swal2-input" placeholder="Enter your full name" style="margin: 0; width: 100%;">
          </div>
          <div style="text-align: left;">
            <label style="display: block; font-size: 14px; color: #64748b; margin-bottom: 4px;">Phone Number</label>
            <input type="tel" id="swal-phone" class="swal2-input" placeholder="Enter your phone number" style="margin: 0; width: 100%;">
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Delete My Account',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#94a3b8',
        preConfirm: () => {
          const enteredName = (document.getElementById('swal-full-name') as HTMLInputElement).value.trim();
          const enteredPhone = (document.getElementById('swal-phone') as HTMLInputElement).value.trim();
          
          if (!enteredName || !enteredPhone) {
            Swal.showValidationMessage('Please fill in all fields');
            return false;
          }
          
          // Normalize for comparison
          const normalizedEnteredName = enteredName.toLowerCase();
          const normalizedFullName = fullName.toLowerCase();
          const normalizedEnteredPhone = enteredPhone.replace(/\D/g, '');
          const normalizedUserPhone = userPhone.replace(/\D/g, '');
          
          if (normalizedEnteredName !== normalizedFullName) {
            Swal.showValidationMessage('Full name does not match our records');
            return false;
          }
          
          if (normalizedEnteredPhone !== normalizedUserPhone) {
            Swal.showValidationMessage('Phone number does not match our records');
            return false;
          }
          
          return { name: enteredName, phone: enteredPhone };
        }
      });

      if (formValues) {
        // Show loading
        Swal.fire({
          title: 'Deleting Account...',
          html: 'Please wait while we remove your data.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          // Call secure edge function to handle deletion
          // This cancels Stripe subscriptions, pending commissions, and deletes all user data
          const { error } = await supabase.functions.invoke('delete-account');
          
          if (error) throw error;

          // Sign out the user
          await supabase.auth.signOut();

          Swal.fire({
            icon: 'success',
            title: 'Account Deleted',
            text: 'Your account, subscription, and all associated data have been permanently removed.',
            confirmButtonColor: '#3b82f6',
          }).then(() => {
            navigate('/');
          });
        } catch (error: any) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete account. Please contact support.',
            confirmButtonColor: '#3b82f6'
          });
        }
      }
    };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">{t("account.email")}</h4>
              {editingEmail ? (
                emailVerifyStep === "code" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-slate-500">{t("dashboard.enterCodeSentTo")} <strong>{newEmail}</strong></p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailVerifyCode}
                      onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="max-w-[120px] text-center tracking-widest"
                    />
                    {emailResendCooldown > 0 ? (
                      <p className="text-xs text-slate-400">{t("onboarding.resendIn", { seconds: emailResendCooldown })}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={sendingEmailCode}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("onboarding.resendCode")}
                      </button>
                    )}
                  </div>
                ) : (
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 max-w-xs"
                    placeholder={t("dashboard.enterNewEmail")}
                  />
                )
              ) : (
                <p className="text-sm text-slate-500">{privateProfile?.email || user?.email || t("account.notSet")}</p>
              )}
            </div>
            {!editingEmail && (
              profile?.email_verified ? (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t("dashboard.verified")}
                </span>
              ) : (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {t("dashboard.unverified")}
                </span>
              )
            )}
            {editingEmail ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEmailEdit}
                  disabled={sendingEmailCode || verifyingEmailCode}
                >
                  {t("common.cancel")}
                </Button>
                {emailVerifyStep === "code" ? (
                  <Button 
                    size="sm" 
                    onClick={handleVerifyEmailCode}
                    disabled={verifyingEmailCode || emailVerifyCode.length !== 6}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    {verifyingEmailCode ? t("onboarding.verifying") : t("onboarding.verifyCode")}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleSendEmailCode}
                    disabled={sendingEmailCode}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    {sendingEmailCode ? t("onboarding.sending") : t("dashboard.sendCode")}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewEmail(privateProfile?.email || user?.email || "");
                  setEditingEmail(true);
                  setEmailVerifyStep("idle");
                  setEmailVerifyCode("");
                  setEmailCodeSent(false);
                }}
              >
                Update
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">{t("account.phone")}</h4>
              {editingPhone ? (
                phoneVerifyStep === "code" ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-slate-500">{t("dashboard.enterCodeSentToEmail")}</p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={phoneVerifyCode}
                      onChange={(e) => setPhoneVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="max-w-[120px] text-center tracking-widest"
                    />
                    {phoneResendCooldown > 0 ? (
                      <p className="text-xs text-slate-400">{t("onboarding.resendIn", { seconds: phoneResendCooldown })}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneCode}
                        disabled={sendingPhoneCode}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("onboarding.resendCode")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 max-w-xs">
                    <PhoneInputField
                      value={newPhone}
                      onChange={(val) => setNewPhone(val || "")}
                      placeholder="Phone number"
                    />
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-600 font-medium">{formatPhoneDisplay(privateProfile?.phone || null)}</p>
              )}
            </div>
            {!editingPhone && (
              profile?.phone_verified ? (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t("dashboard.verified")}
                </span>
              ) : privateProfile?.phone ? (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {t("dashboard.unverified")}
                </span>
              ) : null
            )}
            {editingPhone ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelPhoneEdit}
                  disabled={sendingPhoneCode || verifyingPhoneCode}
                >
                  {t("common.cancel")}
                </Button>
                {phoneVerifyStep === "code" ? (
                  <Button 
                    size="sm" 
                    onClick={handleVerifyPhoneCode}
                    disabled={verifyingPhoneCode || phoneVerifyCode.length !== 6}
                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {verifyingPhoneCode ? t("onboarding.verifying") : t("onboarding.verifyCode")}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleSendPhoneCode}
                    disabled={sendingPhoneCode}
                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {sendingPhoneCode ? t("onboarding.sending") : t("dashboard.sendCode")}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewPhone(normalizePhoneForStorage(privateProfile?.phone || ""));
                  setEditingPhone(true);
                  setPhoneVerifyStep("idle");
                  setPhoneVerifyCode("");
                  setPhoneCodeSent(false);
                }}
              >
                Update
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">{t("dashboard.birthday")}</h4>
              {editingBirthday ? (
                <Input
                  type="date"
                  value={newBirthday}
                  onChange={(e) => setNewBirthday(e.target.value)}
                  className="mt-1 max-w-xs"
                  max={new Date().toISOString().split('T')[0]}
                />
              ) : (
                <p className="text-sm text-slate-500">{privateProfile?.birthday ? formatBirthdayDisplay(privateProfile?.birthday) : t("account.notSet")}</p>
              )}
            </div>
            {editingBirthday ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingBirthday(false)}
                  disabled={updatingBirthday}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleUpdateBirthday}
                  disabled={updatingBirthday}
                  className="bg-gradient-to-r from-pink-500 to-rose-500"
                >
                  {updatingBirthday ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setNewBirthday(privateProfile?.birthday || ""); setEditingBirthday(true); }}>
                {t("account.update")}
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2 ml-13">{t("dashboard.birthdayDescription")}</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">{t("account.password")}</h4>
              <p className="text-sm text-slate-500">{t("dashboard.lastChangedDaysAgo")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangePassword}>{t("account.changePassword")}</Button>
          </div>
        </div>

        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <h4 className="font-medium text-red-800 mb-2">{t("account.dangerZone")}</h4>
          <p className="text-sm text-red-600 mb-2">{t("account.deleteWarning")}</p>
          <p className="text-sm text-red-600 mb-4 font-medium">⚠️ {t("account.deleteWarning2")}</p>
          <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>{t("account.deleteAccount")}</Button>
        </div>
      </div>
    );
  }

  const renderPrivacyTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("privacy.showOnlineStatus")}</h4>
            <p className="text-sm text-slate-500">{t("privacy.showOnlineStatusDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.showOnlineStatus} 
          onCheckedChange={(checked) => setSettings({ ...settings, showOnlineStatus: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("privacy.showLastSeen")}</h4>
            <p className="text-sm text-slate-500">{t("privacy.showLastSeenDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.showLastSeen} 
          onCheckedChange={(checked) => setSettings({ ...settings, showLastSeen: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("privacy.allowMessages")}</h4>
            <p className="text-sm text-slate-500">{t("privacy.allowMessagesDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.allowMessages} 
          onCheckedChange={(checked) => setSettings({ ...settings, allowMessages: checked })}
        />
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("notifications.emailNotifications")}</h4>
            <p className="text-sm text-slate-500">{t("notifications.emailNotificationsDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.emailNotifications} 
          onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("notifications.pushNotifications")}</h4>
            <p className="text-sm text-slate-500">{t("notifications.pushNotificationsDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.pushNotifications} 
          onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("notifications.messageNotifications")}</h4>
            <p className="text-sm text-slate-500">{t("notifications.messageNotificationsDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.messageNotifications} 
          onCheckedChange={(checked) => setSettings({ ...settings, messageNotifications: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">{t("notifications.friendRequests")}</h4>
            <p className="text-sm text-slate-500">{t("notifications.friendRequestsDesc")}</p>
          </div>
        </div>
        <Switch 
          checked={settings.friendRequestNotifications} 
          onCheckedChange={(checked) => setSettings({ ...settings, friendRequestNotifications: checked })}
        />
      </div>
    </div>
  );

  const renderAppearanceTab = () => {
    const handlePlatformGalleryToggle = (checked: boolean) => {
      if (checked) {
        localStorage.removeItem("platformGalleryHidden");
      } else {
        localStorage.setItem("platformGalleryHidden", "true");
      }
      setPlatformGalleryVisible(checked);
      window.dispatchEvent(new CustomEvent("platform-gallery-visibility-changed"));
    };

    const handleNewsWidgetToggle = (checked: boolean) => {
      if (checked) {
        localStorage.removeItem("newsWidgetHidden");
      } else {
        localStorage.setItem("newsWidgetHidden", "true");
      }
      setNewsWidgetVisible(checked);
      window.dispatchEvent(new CustomEvent("news-widget-visibility-changed"));
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Languages className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="font-medium text-slate-800">Language</h4>
              <p className="text-sm text-slate-500">Choose your preferred language</p>
            </div>
          </div>
          <LanguageSwitcher variant="full" />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="font-medium text-slate-800">{t("appearance.darkMode")}</h4>
              <p className="text-sm text-slate-500">{t("appearance.darkModeDesc")}</p>
            </div>
          </div>
          <Switch 
            checked={settings.darkMode} 
            onCheckedChange={(checked) => setSettings({ ...settings, darkMode: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="font-medium text-slate-800">{t("appearance.compactMode")}</h4>
              <p className="text-sm text-slate-500">{t("appearance.compactModeDesc")}</p>
            </div>
          </div>
          <Switch 
            checked={settings.compactMode} 
            onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
          />
        </div>

        {/* Feed Widgets Section */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-600 mb-3">{t("appearance.feedWidgets", "Feed Widgets")}</h3>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <Images className="w-5 h-5 text-slate-500" />
              <div>
                <h4 className="font-medium text-slate-800">{t("appearance.platformGallery", "Platform Gallery")}</h4>
                <p className="text-sm text-slate-500">{t("appearance.platformGalleryDesc", "Show official platform photos in feed")}</p>
              </div>
            </div>
            <Switch 
              checked={platformGalleryVisible} 
              onCheckedChange={handlePlatformGalleryToggle}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mt-3">
            <div className="flex items-center gap-3">
              <Newspaper className="w-5 h-5 text-slate-500" />
              <div>
                <h4 className="font-medium text-slate-800">{t("appearance.newsWidget", "My News")}</h4>
                <p className="text-sm text-slate-500">{t("appearance.newsWidgetDesc", "Show personalized news in sidebar")}</p>
              </div>
            </div>
            <Switch 
              checked={newsWidgetVisible} 
              onCheckedChange={handleNewsWidgetToggle}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileTab();
      case "account":
        return renderAccountTab();
      case "about":
        return <AboutSettings />;
      case "business":
        return <BusinessManagement />;
      case "groups":
        return <GroupsManagement />;
      case "watch-history":
        return (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border">
              <h3 className="text-lg font-medium">{t("dashboard.watchHistory") || "Watch History"}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.watchHistoryDescription") || "Videos you've watched"}</p>
            </div>
            <RecentlyWatchedSection />
          </div>
        );
      case "privacy":
        return renderPrivacyTab();
      case "notifications":
        return renderNotificationsTab();
      case "appearance":
        return renderAppearanceTab();
      default:
        return renderProfileTab();
    }
  };

  // Handle tab change and close sidebar on mobile
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Header with Menu Toggle */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <h1 className="font-semibold text-slate-800 text-sm">{t("dashboard.title")}</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 pt-14"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={cn(
        "bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out",
        isMobile 
          ? "fixed inset-y-0 left-0 z-50 w-72 pt-14 transform" + (sidebarOpen ? " translate-x-0" : " -translate-x-full")
          : "w-72 relative"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-800">{t("dashboard.title")}</h1>
              <p className="text-xs text-slate-500">{t("dashboard.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("dashboard.quickLinks")}</h3>
          <div className="space-y-1">
            {getQuickLinks(t).map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-600 hover:text-blue-600"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <ScrollArea className="flex-1 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t("common.settings")}</h3>
          <div className="space-y-1">
            {getMenuItems(t).map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                  activeTab === item.id
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-sm"
                    : "hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  activeTab === item.id
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20"
                    : "bg-slate-100"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5",
                    activeTab === item.id ? "text-white" : "text-slate-500"
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "font-medium text-sm",
                      activeTab === item.id ? "text-blue-700" : "text-slate-700"
                    )}>
                      {item.label}
                    </p>
                    {item.id === "groups" && pendingRequestsCount > 0 && (
                      <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                        {pendingRequestsCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4",
                  activeTab === item.id ? "text-blue-500" : "text-slate-300"
                )} />
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm text-red-600"
          >
            <LogOut className="w-4 h-4" />
            {t("common.logOut")}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        isMobile && "pt-14"
      )}>
        {/* Cover Photo with Avatar Header */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden group">
            {profile?.cover_url ? (
              <img 
                src={profile.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30" />
            )}
            <button 
              onClick={() => setCoverEditorOpen(true)}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 flex items-center gap-2 text-white text-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <Camera className="w-4 h-4" />
              {t("cover.updateCover")}
            </button>
          </div>
          
          {/* Avatar overlapping cover */}
          <div className="absolute -bottom-12 left-8">
            <button
              onClick={() => setAvatarEditorOpen(true)}
              className="relative group/avatar"
              title="Edit Avatar"
            >
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl">
                  {formData.display_name?.charAt(0) || formData.first_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
          
          {/* Profile Info next to avatar - hidden on mobile/tablet */}
          {!isMobile && (
            <div className="absolute -bottom-12 left-36 flex items-end gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{formData.display_name || "Your Name"}</h2>
                <p className="text-sm text-slate-500">@{formData.username || "username"}</p>
              </div>
            </div>
          )}
          
          {/* Tab Title on the right - hidden on mobile/tablet */}
          {!isMobile && (
            <div className="absolute -bottom-12 right-8 text-right">
              <h3 className="text-lg font-semibold text-slate-700">
                {getMenuItems(t).find(item => item.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-slate-400">
                {getMenuItems(t).find(item => item.id === activeTab)?.description}
              </p>
            </div>
          )}
        </div>
        
        {/* Spacer for avatar overlap - smaller on mobile */}
        <div className={cn("bg-white border-b border-slate-200", isMobile ? "h-14" : "h-16")} />

        {/* Avatar Editor Modal */}
        <AvatarEditor
          open={avatarEditorOpen}
          onOpenChange={setAvatarEditorOpen}
          onAvatarSaved={(url) => {
            refreshProfile();
          }}
          userId={user?.id}
          currentAvatar={profile?.avatar_url || undefined}
          userName={formData.display_name || `${formData.first_name} ${formData.last_name}`.trim() || "User"}
        />
        
        {/* Cover Editor Modal */}
        <CoverEditor
          open={coverEditorOpen}
          onOpenChange={setCoverEditorOpen}
          onCoverSaved={(url) => {
            refreshProfile();
          }}
          userId={user?.id}
          currentCover={profile?.cover_url || undefined}
        />

        {/* Unsaved Changes Warning Dialog */}
        <AlertDialog open={isBlocked} onOpenChange={(open) => !open && reset()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("dashboard.unsavedChangesTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("dashboard.unsavedChangesDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={reset}>{t("dashboard.stayOnPage")}</AlertDialogCancel>
              <AlertDialogAction onClick={proceed} className="bg-destructive hover:bg-destructive/90">
                {t("dashboard.leaveWithoutSaving")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Content Area */}
        <ScrollArea className={cn("flex-1", isMobile ? "p-4" : "p-8")}>
          <div className={cn(isMobile ? "w-full" : "max-w-2xl")}>
            {renderTabContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MemberDashboard;
