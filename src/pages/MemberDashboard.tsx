import React, { useState, useCallback } from "react";
import { 
  User, Settings, Bell, Shield, Palette, Layout, Camera, Save,
  ChevronRight, Eye, EyeOff, Lock, Mail, Phone, Globe, Calendar,
  Home, CreditCard, Users, Heart, MessageCircle, LogOut, Clock,
  CheckCircle2, XCircle, Loader2, ExternalLink
} from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateUsername } from "@/lib/username";

type TabType = "profile" | "account" | "privacy" | "notifications" | "appearance";

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

const menuItems = [
  { id: "profile" as TabType, label: "Profile", icon: User, description: "Manage your public profile" },
  { id: "account" as TabType, label: "Account", icon: Settings, description: "Account settings & security" },
  { id: "privacy" as TabType, label: "Privacy", icon: Shield, description: "Control your privacy settings" },
  { id: "notifications" as TabType, label: "Notifications", icon: Bell, description: "Notification preferences" },
  { id: "appearance" as TabType, label: "Appearance", icon: Palette, description: "Customize your experience" },
];

const quickLinks = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Commissions", icon: CreditCard, path: "/commissions" },
  { label: "Pricing", icon: Heart, path: "/pricing" },
];

const MemberDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
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

  // Account tab editing state (moved to top level for hooks rules)
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Fetch private profile data
  React.useEffect(() => {
    const fetchPrivateProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('get-my-private-profile');
        if (!error && data?.data) {
          setPrivateProfile(data.data);
        }
      } catch (err) {
        console.error("Error fetching private profile:", err);
      }
    };
    fetchPrivateProfile();
  }, [user]);

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
      <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl">
              {formData.display_name?.charAt(0) || formData.first_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-all">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">{formData.display_name || "Your Name"}</h3>
          <p className="text-slate-500">@{formData.username || "username"}</p>
          <p className="text-sm text-slate-400 mt-1">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="John"
            className="border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
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
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder="Your display name"
          className="border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="username">Username</Label>
          {formData.username && (
            <Link 
              to={`/${formData.username}`} 
              className="text-xs text-primary hover:underline flex items-center gap-1"
              target="_blank"
            >
              View Profile <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
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
          <p className="text-xs text-emerald-600">Username is available!</p>
        )}
        {profile?.username_changed === true ? (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            You have already used your one-time username change.
          </p>
        ) : (
          <p className="text-xs text-amber-600">
            ⚠️ You can only change your username once. Choose wisely!
          </p>
        )}
        <p className="text-xs text-slate-400">
          Your profile URL: weshare.com/{formData.username || "username"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell us about yourself..."
          className="border-slate-200 min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          {profile?.country && (
            <img 
              src={`https://flagcdn.com/w20/${profile.country.toLowerCase()}.png`}
              alt={countryNames[profile.country] || profile.country}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-auto rounded-sm"
            />
          )}
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="City"
            className={profile?.country ? "pl-10 pr-28 border-slate-200" : "border-slate-200"}
          />
          {profile?.country && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground whitespace-nowrap">
              {countryNames[profile.country] || profile.country}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">Enter your city. Country is detected automatically.</p>
      </div>

      <Button 
        onClick={handleSaveProfile} 
        disabled={saving}
        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );

  const renderAccountTab = () => {
    const handleUpdateEmail = async () => {
      if (!newEmail || newEmail === (privateProfile?.email || user?.email)) {
        setEditingEmail(false);
        return;
      }
      setUpdatingEmail(true);
      try {
        const { error } = await supabase.functions.invoke('store-private-profile', {
          body: { email: newEmail }
        });
        if (error) throw error;
        
        const { data } = await supabase.functions.invoke('get-my-private-profile');
        if (data?.data) setPrivateProfile(data.data);
        
        toast.success("Email updated successfully!");
        setEditingEmail(false);
      } catch (error) {
        console.error("Error updating email:", error);
        toast.error("Failed to update email");
      } finally {
        setUpdatingEmail(false);
      }
    };

    const handleUpdatePhone = async () => {
      if (!newPhone || newPhone === privateProfile?.phone) {
        setEditingPhone(false);
        return;
      }
      setUpdatingPhone(true);
      try {
        const { error } = await supabase.functions.invoke('store-private-profile', {
          body: { phone: newPhone }
        });
        if (error) throw error;
        
        const { data } = await supabase.functions.invoke('get-my-private-profile');
        if (data?.data) setPrivateProfile(data.data);
        
        toast.success("Phone number updated successfully!");
        setEditingPhone(false);
      } catch (error) {
        console.error("Error updating phone:", error);
        toast.error("Failed to update phone number");
      } finally {
        setUpdatingPhone(false);
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
          const userId = user?.id;
          if (!userId) throw new Error('User not found');

          // Cancel any pending commissions where this user was the referred member
          // (referrer should not receive payment for a deleted member)
          await supabase
            .from('commissions')
            .update({ status: 'cancelled' })
            .eq('referred_user_id', userId)
            .eq('status', 'pending');

          // Delete user data from all tables
          await Promise.all([
            supabase.from('posts').delete().eq('user_id', userId),
            supabase.from('post_likes').delete().eq('user_id', userId),
            supabase.from('post_comments').delete().eq('user_id', userId),
            supabase.from('stories').delete().eq('user_id', userId),
            supabase.from('story_views').delete().eq('viewer_id', userId),
            supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
            supabase.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
            supabase.from('event_rsvps').delete().eq('user_id', userId),
            supabase.from('commissions').delete().eq('referrer_id', userId),
            supabase.from('subscriptions').delete().eq('user_id', userId),
            supabase.from('profiles').delete().eq('user_id', userId),
          ]);

          // Sign out the user
          await supabase.auth.signOut();

          Swal.fire({
            icon: 'success',
            title: 'Account Deleted',
            text: 'Your account and all associated data have been permanently removed.',
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
              <h4 className="font-medium text-slate-800">Email Address</h4>
              {editingEmail ? (
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 max-w-xs"
                  placeholder="Enter new email"
                />
              ) : (
                <p className="text-sm text-slate-500">{privateProfile?.email || user?.email || "Not set"}</p>
              )}
            </div>
            {profile?.email_verified && !editingEmail && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">Verified</span>
            )}
            {editingEmail ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingEmail(false)}
                  disabled={updatingEmail}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleUpdateEmail}
                  disabled={updatingEmail}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  {updatingEmail ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setNewEmail(privateProfile?.email || user?.email || ""); setEditingEmail(true); }}>
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
              <h4 className="font-medium text-slate-800">Phone Number</h4>
              {editingPhone ? (
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 max-w-xs"
                  placeholder="Enter new phone number"
                />
              ) : (
                <p className="text-sm text-slate-500">{privateProfile?.phone || "Not set"}</p>
              )}
            </div>
            {profile?.phone_verified && !editingPhone && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">Verified</span>
            )}
            {editingPhone ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingPhone(false)}
                  disabled={updatingPhone}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleUpdatePhone}
                  disabled={updatingPhone}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {updatingPhone ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setNewPhone(privateProfile?.phone || ""); setEditingPhone(true); }}>
                Update
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">Password</h4>
              <p className="text-sm text-slate-500">Last changed 30 days ago</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangePassword}>Change Password</Button>
          </div>
        </div>

        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
          <p className="text-sm text-red-600 mb-2">Once you delete your account, there is no going back. Please be certain.</p>
          <p className="text-sm text-red-600 mb-4 font-medium">⚠️ You will also lose all funds from your subscription and any pending commissions.</p>
          <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Delete Account</Button>
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
            <h4 className="font-medium text-slate-800">Show Online Status</h4>
            <p className="text-sm text-slate-500">Let others see when you're online</p>
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
            <h4 className="font-medium text-slate-800">Show Last Seen</h4>
            <p className="text-sm text-slate-500">Display your last active time</p>
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
            <h4 className="font-medium text-slate-800">Allow Direct Messages</h4>
            <p className="text-sm text-slate-500">Let anyone send you messages</p>
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
            <h4 className="font-medium text-slate-800">Email Notifications</h4>
            <p className="text-sm text-slate-500">Receive notifications via email</p>
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
            <h4 className="font-medium text-slate-800">Push Notifications</h4>
            <p className="text-sm text-slate-500">Receive push notifications</p>
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
            <h4 className="font-medium text-slate-800">Message Notifications</h4>
            <p className="text-sm text-slate-500">Get notified for new messages</p>
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
            <h4 className="font-medium text-slate-800">Friend Requests</h4>
            <p className="text-sm text-slate-500">Get notified for friend requests</p>
          </div>
        </div>
        <Switch 
          checked={settings.friendRequestNotifications} 
          onCheckedChange={(checked) => setSettings({ ...settings, friendRequestNotifications: checked })}
        />
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-slate-500" />
          <div>
            <h4 className="font-medium text-slate-800">Dark Mode</h4>
            <p className="text-sm text-slate-500">Switch to dark theme</p>
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
            <h4 className="font-medium text-slate-800">Compact Mode</h4>
            <p className="text-sm text-slate-500">Use a more compact layout</p>
          </div>
        </div>
        <Switch 
          checked={settings.compactMode} 
          onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileTab();
      case "account":
        return renderAccountTab();
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-800">My Dashboard</h1>
              <p className="text-xs text-slate-500">Settings & Preferences</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Links</h3>
          <div className="space-y-1">
            {quickLinks.map((link) => (
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
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Settings</h3>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
                  <p className={cn(
                    "font-medium text-sm",
                    activeTab === item.id ? "text-blue-700" : "text-slate-700"
                  )}>
                    {item.label}
                  </p>
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
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h2>
              <p className="text-slate-500 mt-1">
                {menuItems.find(item => item.id === activeTab)?.description}
              </p>
            </div>
            <Avatar className="w-10 h-10 border-2 border-slate-200">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                {formData.display_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-8">
          <div className="max-w-2xl">
            {renderTabContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MemberDashboard;
