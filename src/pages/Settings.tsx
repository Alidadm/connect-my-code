import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Settings as SettingsIcon, Bell, Sun, Globe, Volume2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { useUserSettings } from "@/hooks/useUserSettings";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { settings, loading: settingsLoading, saving, updateSetting } = useUserSettings();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    updateSetting("language", value);
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-dolphy-purple flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{t("settings.title", { defaultValue: "Settings" })}</h1>
            <p className="text-muted-foreground">{t("settings.subtitle", { defaultValue: "Manage your app preferences" })}</p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("common.saving", { defaultValue: "Saving..." })}</span>
            </div>
          )}
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              {t("settings.appearance", { defaultValue: "Appearance" })}
            </CardTitle>
            <CardDescription>{t("settings.appearanceDesc", { defaultValue: "Customize how DolphySN looks" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.darkMode", { defaultValue: "Dark Mode" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.darkModeDesc", { defaultValue: "Toggle dark theme" })}</p>
              </div>
              <Switch 
                checked={settings.dark_mode}
                onCheckedChange={(checked) => updateSetting("dark_mode", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.compactMode", { defaultValue: "Compact Mode" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.compactModeDesc", { defaultValue: "Show more content with less spacing" })}</p>
              </div>
              <Switch 
                checked={settings.compact_mode}
                onCheckedChange={(checked) => updateSetting("compact_mode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t("settings.notifications", { defaultValue: "Notifications" })}
            </CardTitle>
            <CardDescription>{t("settings.notificationsDesc", { defaultValue: "Control what notifications you receive" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.pushNotifications", { defaultValue: "Push Notifications" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.pushNotificationsDesc", { defaultValue: "Receive notifications on your device" })}</p>
              </div>
              <Switch 
                checked={settings.push_notifications}
                onCheckedChange={(checked) => updateSetting("push_notifications", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.emailNotifications", { defaultValue: "Email Notifications" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.emailNotificationsDesc", { defaultValue: "Receive updates via email" })}</p>
              </div>
              <Switch 
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting("email_notifications", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.friendRequests", { defaultValue: "Friend Requests" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.friendRequestsDesc", { defaultValue: "Notify when someone sends a friend request" })}</p>
              </div>
              <Switch 
                checked={settings.friend_request_notifications}
                onCheckedChange={(checked) => updateSetting("friend_request_notifications", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.birthdayReminders", { defaultValue: "Birthday Reminders" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.birthdayRemindersDesc", { defaultValue: "Get notified about friends' birthdays" })}</p>
              </div>
              <Switch 
                checked={settings.birthday_reminders}
                onCheckedChange={(checked) => updateSetting("birthday_reminders", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sound */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              {t("settings.sound", { defaultValue: "Sound" })}
            </CardTitle>
            <CardDescription>{t("settings.soundDesc", { defaultValue: "Manage sound settings" })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.notificationSound", { defaultValue: "Notification Sound" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notificationSoundDesc", { defaultValue: "Play sound for notifications" })}</p>
              </div>
              <Switch 
                checked={settings.notification_sound}
                onCheckedChange={(checked) => updateSetting("notification_sound", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.messageSound", { defaultValue: "Message Sound" })}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.messageSoundDesc", { defaultValue: "Play sound for new messages" })}</p>
              </div>
              <Switch 
                checked={settings.message_sound}
                onCheckedChange={(checked) => updateSetting("message_sound", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t("settings.language", { defaultValue: "Language" })}
            </CardTitle>
            <CardDescription>{t("settings.languageDesc", { defaultValue: "Choose your preferred language" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={settings.language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
