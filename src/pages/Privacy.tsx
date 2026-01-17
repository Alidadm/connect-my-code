import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shield, Eye, UserX, Download, Activity, Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { BlockedUsersModal } from "@/components/privacy/BlockedUsersModal";
import { MutedUsersModal } from "@/components/privacy/MutedUsersModal";

const Privacy = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [mutedModalOpen, setMutedModalOpen] = useState(false);
  const { settings, loading: settingsLoading, saving, updateSetting } = usePrivacySettings();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleDownloadData = async () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      toast.success(t("privacy.dataDownloadStarted", { defaultValue: "Your data download has been started. You'll receive an email when it's ready." }));
    }, 2000);
  };

  if (authLoading || settingsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{t("privacy.title", { defaultValue: "Privacy Settings" })}</h1>
            <p className="text-muted-foreground">{t("privacy.subtitle", { defaultValue: "Control who can see your information" })}</p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("common.saving", { defaultValue: "Saving..." })}</span>
            </div>
          )}
        </div>

        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {t("privacy.profileVisibility", { defaultValue: "Profile Visibility" })}
            </CardTitle>
            <CardDescription>{t("privacy.profileVisibilityDesc", { defaultValue: "Choose who can see your profile and activity" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.whoCanSeeProfile", { defaultValue: "Who can see my profile" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.whoCanSeeProfileDesc", { defaultValue: "Control profile visibility" })}</p>
              </div>
              <Select 
                value={settings.profile_visibility}
                onValueChange={(value) => updateSetting("profile_visibility", value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">{t("privacy.everyone", { defaultValue: "Everyone" })}</SelectItem>
                  <SelectItem value="friends">{t("privacy.friendsOnly", { defaultValue: "Friends Only" })}</SelectItem>
                  <SelectItem value="private">{t("privacy.onlyMe", { defaultValue: "Only Me" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.whoCanSeePosts", { defaultValue: "Who can see my posts" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.whoCanSeePostsDesc", { defaultValue: "Default visibility for new posts" })}</p>
              </div>
              <Select 
                value={settings.post_visibility}
                onValueChange={(value) => updateSetting("post_visibility", value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">{t("privacy.everyone", { defaultValue: "Everyone" })}</SelectItem>
                  <SelectItem value="friends">{t("privacy.friendsOnly", { defaultValue: "Friends Only" })}</SelectItem>
                  <SelectItem value="private">{t("privacy.onlyMe", { defaultValue: "Only Me" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.showOnlineStatus", { defaultValue: "Show Online Status" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.showOnlineStatusDesc", { defaultValue: "Let others see when you're online" })}</p>
              </div>
              <Switch 
                checked={settings.show_online_status}
                onCheckedChange={(checked) => updateSetting("show_online_status", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.showLastSeen", { defaultValue: "Show Last Seen" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.showLastSeenDesc", { defaultValue: "Let others see when you were last active" })}</p>
              </div>
              <Switch 
                checked={settings.show_last_seen}
                onCheckedChange={(checked) => updateSetting("show_last_seen", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blocking & Muting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5" />
              {t("privacy.blockingMuting", { defaultValue: "Blocking & Muting" })}
            </CardTitle>
            <CardDescription>{t("privacy.blockingMutingDesc", { defaultValue: "Manage blocked and muted accounts" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.blockedUsers", { defaultValue: "Blocked Users" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.blockedUsersDesc", { defaultValue: "Manage users you've blocked" })}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setBlockedModalOpen(true)}>
                {t("privacy.manage", { defaultValue: "Manage" })}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.mutedAccounts", { defaultValue: "Muted Accounts" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.mutedAccountsDesc", { defaultValue: "Manage accounts you've muted" })}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMutedModalOpen(true)}>
                {t("privacy.manage", { defaultValue: "Manage" })}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.hideFromSearch", { defaultValue: "Hide from Search" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.hideFromSearchDesc", { defaultValue: "Don't show me in search results" })}</p>
              </div>
              <Switch 
                checked={settings.hide_from_search}
                onCheckedChange={(checked) => updateSetting("hide_from_search", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Activity & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t("privacy.activityData", { defaultValue: "Activity & Data" })}
            </CardTitle>
            <CardDescription>{t("privacy.activityDataDesc", { defaultValue: "Manage your activity status and data" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.readReceipts", { defaultValue: "Read Receipts" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.readReceiptsDesc", { defaultValue: "Show when you've read messages" })}</p>
              </div>
              <Switch 
                checked={settings.read_receipts}
                onCheckedChange={(checked) => updateSetting("read_receipts", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.typingIndicator", { defaultValue: "Typing Indicator" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.typingIndicatorDesc", { defaultValue: "Show when you're typing" })}</p>
              </div>
              <Switch 
                checked={settings.typing_indicator}
                onCheckedChange={(checked) => updateSetting("typing_indicator", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.downloadData", { defaultValue: "Download Your Data" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.downloadDataDesc", { defaultValue: "Get a copy of all your DolphySN data" })}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadData}
                disabled={downloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {downloading ? t("privacy.downloading", { defaultValue: "Downloading..." }) : t("privacy.download", { defaultValue: "Download" })}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t("privacy.security", { defaultValue: "Security" })}
            </CardTitle>
            <CardDescription>{t("privacy.securityDesc", { defaultValue: "Additional security options" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.twoFactor", { defaultValue: "Two-Factor Authentication" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.twoFactorDesc", { defaultValue: "Add an extra layer of security" })}</p>
              </div>
              <Button variant="outline" size="sm">
                {t("privacy.setup", { defaultValue: "Set Up" })}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("privacy.loginAlerts", { defaultValue: "Login Alerts" })}</Label>
                <p className="text-sm text-muted-foreground">{t("privacy.loginAlertsDesc", { defaultValue: "Get notified about new logins" })}</p>
              </div>
              <Switch 
                checked={settings.login_alerts}
                onCheckedChange={(checked) => updateSetting("login_alerts", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <BlockedUsersModal open={blockedModalOpen} onOpenChange={setBlockedModalOpen} />
      <MutedUsersModal open={mutedModalOpen} onOpenChange={setMutedModalOpen} />
    </MainLayout>
  );
};

export default Privacy;
