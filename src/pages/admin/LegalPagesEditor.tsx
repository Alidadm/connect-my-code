import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, FileText, Shield, Cookie, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Editor, {
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnNumberedList,
  BtnBulletList,
  BtnLink,
  BtnClearFormatting,
  BtnRedo,
  BtnUndo,
  Separator,
  Toolbar,
  ContentEditableEvent,
} from "react-simple-wysiwyg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LegalPage {
  id: string;
  page_type: string;
  title: string;
  content: string;
}

const LegalPagesEditor = () => {
  const [pages, setPages] = useState<Record<string, LegalPage>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("terms");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from("legal_pages")
      .select("*");

    if (error) {
      toast.error("Failed to load legal pages");
      console.error(error);
    } else if (data) {
      const pagesMap: Record<string, LegalPage> = {};
      data.forEach((page) => {
        pagesMap[page.page_type] = page;
      });
      setPages(pagesMap);
    }
    setLoading(false);
  };

  const handleSave = async (pageType: string) => {
    const page = pages[pageType];
    if (!page) return;

    setSaving(true);
    const { error } = await supabase
      .from("legal_pages")
      .update({
        title: page.title,
        content: page.content,
        updated_at: new Date().toISOString(),
      })
      .eq("page_type", pageType);

    if (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } else {
      toast.success("Changes saved successfully");
    }
    setSaving(false);
  };

  const updatePage = (pageType: string, field: "title" | "content", value: string) => {
    setPages((prev) => ({
      ...prev,
      [pageType]: {
        ...prev[pageType],
        [field]: value,
      },
    }));
  };

  const tabConfig = [
    { key: "terms", label: "Terms of Service", icon: FileText, path: "/terms" },
    { key: "privacy", label: "Privacy Policy", icon: Shield, path: "/privacy-policy" },
    { key: "cookies", label: "Cookies Policy", icon: Cookie, path: "/cookies-policy" },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Legal Pages Editor</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {tabConfig.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfig.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{pages[tab.key]?.title || tab.label}</DialogTitle>
                        </DialogHeader>
                        <div
                          className="prose prose-slate dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: pages[tab.key]?.content || "" }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={() => handleSave(tab.key)}
                      disabled={saving}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Page Title</Label>
                    <Input
                      value={pages[tab.key]?.title || ""}
                      onChange={(e) => updatePage(tab.key, "title", e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Content</Label>
                    <div className="bg-white rounded-lg overflow-hidden">
                      <Editor
                        value={pages[tab.key]?.content || ""}
                        onChange={(e: ContentEditableEvent) => updatePage(tab.key, "content", e.target.value)}
                        containerProps={{
                          style: {
                            minHeight: "500px",
                            resize: "vertical",
                          },
                        }}
                      >
                        <Toolbar>
                          <BtnUndo />
                          <BtnRedo />
                          <Separator />
                          <BtnBold />
                          <BtnItalic />
                          <BtnUnderline />
                          <BtnStrikeThrough />
                          <Separator />
                          <select
                            className="rsw-btn"
                            onChange={(e) => {
                              document.execCommand("formatBlock", false, e.target.value);
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Heading</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                            <option value="h4">Heading 4</option>
                            <option value="p">Paragraph</option>
                          </select>
                          <select
                            className="rsw-btn"
                            onChange={(e) => {
                              document.execCommand("fontSize", false, e.target.value);
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Size</option>
                            <option value="1">Small</option>
                            <option value="2">Normal</option>
                            <option value="3">Medium</option>
                            <option value="4">Large</option>
                            <option value="5">X-Large</option>
                            <option value="6">XX-Large</option>
                            <option value="7">Huge</option>
                          </select>
                          <Separator />
                          <button
                            className="rsw-btn"
                            onClick={() => document.execCommand("justifyLeft")}
                            title="Align Left"
                            type="button"
                          >
                            ◀
                          </button>
                          <button
                            className="rsw-btn"
                            onClick={() => document.execCommand("justifyCenter")}
                            title="Align Center"
                            type="button"
                          >
                            ≡
                          </button>
                          <button
                            className="rsw-btn"
                            onClick={() => document.execCommand("justifyRight")}
                            title="Align Right"
                            type="button"
                          >
                            ▶
                          </button>
                          <Separator />
                          <BtnNumberedList />
                          <BtnBulletList />
                          <Separator />
                          <BtnLink />
                          <Separator />
                          <input
                            type="color"
                            className="rsw-btn"
                            style={{ width: "30px", height: "24px", padding: "2px" }}
                            onChange={(e) => document.execCommand("foreColor", false, e.target.value)}
                            title="Text Color"
                          />
                          <input
                            type="color"
                            className="rsw-btn"
                            style={{ width: "30px", height: "24px", padding: "2px" }}
                            onChange={(e) => document.execCommand("hiliteColor", false, e.target.value)}
                            title="Highlight Color"
                            defaultValue="#ffff00"
                          />
                          <Separator />
                          <BtnClearFormatting />
                        </Toolbar>
                      </Editor>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    Public URL: <code className="bg-slate-700 px-2 py-1 rounded">{tab.path}</code>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default LegalPagesEditor;
