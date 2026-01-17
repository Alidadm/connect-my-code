import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { HelpCircle, Send, Mail, MessageSquare, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const HelpSupport = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.message) {
      toast.error(t("support.fillAllFields", { defaultValue: "Please fill in all fields" }));
      return;
    }

    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      toast.success(t("support.ticketSubmitted", { defaultValue: "Your support ticket has been submitted. We'll get back to you soon!" }));
      setFormData({ category: "", subject: "", message: "" });
    }, 1500);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  const helpTopics = [
    {
      icon: MessageSquare,
      title: t("support.accountSettings", { defaultValue: "Account & Settings" }),
      description: t("support.accountSettingsDesc", { defaultValue: "Password, email, profile settings" }),
    },
    {
      icon: Mail,
      title: t("support.billingPayments", { defaultValue: "Billing & Payments" }),
      description: t("support.billingPaymentsDesc", { defaultValue: "Subscriptions, commissions, payouts" }),
    },
    {
      icon: FileText,
      title: t("support.contentModeration", { defaultValue: "Content & Moderation" }),
      description: t("support.contentModerationDesc", { defaultValue: "Posts, groups, reporting issues" }),
    },
    {
      icon: HelpCircle,
      title: t("support.technicalIssues", { defaultValue: "Technical Issues" }),
      description: t("support.technicalIssuesDesc", { defaultValue: "Bugs, errors, app performance" }),
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("support.title", { defaultValue: "Help & Support" })}</h1>
            <p className="text-muted-foreground">{t("support.subtitle", { defaultValue: "We're here to help you" })}</p>
          </div>
        </div>

        {/* Quick Help Topics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {helpTopics.map((topic, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <topic.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              {t("support.contactUs", { defaultValue: "Contact Us" })}
            </CardTitle>
            <CardDescription>{t("support.contactUsDesc", { defaultValue: "Submit a support ticket and we'll respond within 24-48 hours" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("support.name", { defaultValue: "Name" })}</Label>
                  <Input
                    id="name"
                    value={profile?.display_name || ""}
                    disabled
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("support.email", { defaultValue: "Email" })}</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-secondary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("support.category", { defaultValue: "Category" })} *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("support.selectCategory", { defaultValue: "Select a category" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">{t("support.accountSettings", { defaultValue: "Account & Settings" })}</SelectItem>
                    <SelectItem value="billing">{t("support.billingPayments", { defaultValue: "Billing & Payments" })}</SelectItem>
                    <SelectItem value="content">{t("support.contentModeration", { defaultValue: "Content & Moderation" })}</SelectItem>
                    <SelectItem value="technical">{t("support.technicalIssues", { defaultValue: "Technical Issues" })}</SelectItem>
                    <SelectItem value="other">{t("support.other", { defaultValue: "Other" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("support.subject", { defaultValue: "Subject" })} *</Label>
                <Input
                  id="subject"
                  placeholder={t("support.subjectPlaceholder", { defaultValue: "Brief description of your issue" })}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t("support.message", { defaultValue: "Message" })} *</Label>
                <Textarea
                  id="message"
                  placeholder={t("support.messagePlaceholder", { defaultValue: "Please describe your issue in detail..." })}
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("support.submitting", { defaultValue: "Submitting..." })}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("support.submitTicket", { defaultValue: "Submit Ticket" })}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle>{t("support.additionalResources", { defaultValue: "Additional Resources" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href="mailto:support@dolphysn.com" target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t("support.emailUs", { defaultValue: "Email us directly" })}
                </div>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/privacy")}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("support.privacyPolicy", { defaultValue: "Privacy Policy" })}
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HelpSupport;
