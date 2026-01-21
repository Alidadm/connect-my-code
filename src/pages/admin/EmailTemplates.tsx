import { useState, useEffect } from "react";
import { Save, Mail, Key, Loader2, Eye, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Editor from "react-simple-wysiwyg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplates {
  signup_confirmation: EmailTemplate;
  forgot_password: EmailTemplate;
  welcome: EmailTemplate;
}

const EmailTemplatesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplates>({
    signup_confirmation: {
      subject: "Welcome to DolphySN - Verify Your Email",
      body: ""
    },
    forgot_password: {
      subject: "DolphySN - Password Reset Code",
      body: ""
    },
    welcome: {
      subject: "Welcome to DolphySN! 🎉",
      body: ""
    }
  });
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "email_templates")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data?.setting_value) {
        const value = data.setting_value as unknown as EmailTemplates;
        setTemplates(prev => ({
          signup_confirmation: value.signup_confirmation || prev.signup_confirmation,
          forgot_password: value.forgot_password || prev.forgot_password,
          welcome: value.welcome || prev.welcome
        }));
      }
    } catch (error: any) {
      toast.error("Failed to load templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ setting_value: JSON.parse(JSON.stringify(templates)) })
        .eq("setting_key", "email_templates");

      if (error) throw error;

      toast.success("Email templates saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save templates: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (
    type: keyof EmailTemplates,
    field: keyof EmailTemplate,
    value: string
  ) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handlePreview = (body: string) => {
    // Replace placeholders with sample data
    const previewBody = body
      .replace(/\{\{name\}\}/g, "John Doe")
      .replace(/\{\{first_name\}\}/g, "John")
      .replace(/\{\{confirmation_link\}\}/g, "https://dolphysn.com/confirm-email?token=example")
      .replace(/\{\{code\}\}/g, "123456")
      .replace(/\{\{email\}\}/g, "john@example.com")
      .replace(/\{\{username\}\}/g, "john.doe");
    setPreviewHtml(previewBody);
  };

  if (loading) {
    return (
      <AdminLayout title="Email Templates">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Email Templates">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Email Templates</h1>
              <p className="text-sm text-muted-foreground">Manage email templates with visual editor</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Templates
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-5xl mx-auto">
          <Tabs defaultValue="signup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border">
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Signup Confirmation
              </TabsTrigger>
              <TabsTrigger value="welcome" className="flex items-center gap-2">
                <PartyPopper className="w-4 h-4" />
                Welcome Email
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Forgot Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Signup Confirmation Email</CardTitle>
                  <CardDescription>
                    This email is sent when a new user registers. Available placeholders: 
                    <code className="ml-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{name}}"}</code>, 
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{confirmation_link}}"}</code>, 
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{email}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-subject">Subject Line</Label>
                    <Input
                      id="signup-subject"
                      value={templates.signup_confirmation.subject}
                      onChange={(e) => handleTemplateChange("signup_confirmation", "subject", e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email Body</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(templates.signup_confirmation.body)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Email Preview</DialogTitle>
                          </DialogHeader>
                          <div 
                            className="border rounded-lg p-4 bg-white"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <Editor
                        value={templates.signup_confirmation.body}
                        onChange={(e) => handleTemplateChange("signup_confirmation", "body", e.target.value)}
                        containerProps={{ style: { minHeight: '400px' } }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="welcome">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Email</CardTitle>
                  <CardDescription>
                    This email is sent after a user confirms their email. Available placeholders: 
                    <code className="ml-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{name}}"}</code>, 
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{first_name}}"}</code>, 
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{username}}"}</code>,
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{email}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-subject">Subject Line</Label>
                    <Input
                      id="welcome-subject"
                      value={templates.welcome.subject}
                      onChange={(e) => handleTemplateChange("welcome", "subject", e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email Body</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(templates.welcome.body)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Email Preview</DialogTitle>
                          </DialogHeader>
                          <div 
                            className="border rounded-lg p-4 bg-white"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <Editor
                        value={templates.welcome.body}
                        onChange={(e) => handleTemplateChange("welcome", "body", e.target.value)}
                        containerProps={{ style: { minHeight: '400px' } }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Forgot Password Email</CardTitle>
                  <CardDescription>
                    This email is sent when a user requests a password reset. Available placeholders: 
                    <code className="ml-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{code}}"}</code>, 
                    <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-xs">{"{{email}}"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password-subject">Subject Line</Label>
                    <Input
                      id="password-subject"
                      value={templates.forgot_password.subject}
                      onChange={(e) => handleTemplateChange("forgot_password", "subject", e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email Body</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(templates.forgot_password.body)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Email Preview</DialogTitle>
                          </DialogHeader>
                          <div 
                            className="border rounded-lg p-4 bg-white"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <Editor
                        value={templates.forgot_password.body}
                        onChange={(e) => handleTemplateChange("forgot_password", "body", e.target.value)}
                        containerProps={{ style: { minHeight: '400px' } }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailTemplatesPage;