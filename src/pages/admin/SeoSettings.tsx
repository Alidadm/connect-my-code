import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, Trash2, Search, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SeoSetting {
  id: string;
  page_path: string;
  title: string | null;
  description: string | null;
  keywords: string[];
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  robots: string | null;
  created_at: string;
  updated_at: string;
}

export default function SeoSettings() {
  const [seoSettings, setSeoSettings] = useState<SeoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SeoSetting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    page_path: "",
    title: "",
    description: "",
    keywords: [] as string[],
    og_title: "",
    og_description: "",
    og_image_url: "",
    canonical_url: "",
    robots: "index, follow",
  });

  useEffect(() => {
    fetchSeoSettings();
  }, []);

  const fetchSeoSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("seo_settings")
        .select("*")
        .order("page_path");

      if (error) throw error;
      setSeoSettings(data || []);
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      toast.error("Failed to load SEO settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({ ...formData, keywords: [...formData.keywords, keyword] });
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keywordToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const openNewDialog = () => {
    setSelectedSetting(null);
    setFormData({
      page_path: "",
      title: "",
      description: "",
      keywords: [],
      og_title: "",
      og_description: "",
      og_image_url: "",
      canonical_url: "",
      robots: "index, follow",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (setting: SeoSetting) => {
    setSelectedSetting(setting);
    setFormData({
      page_path: setting.page_path,
      title: setting.title || "",
      description: setting.description || "",
      keywords: setting.keywords || [],
      og_title: setting.og_title || "",
      og_description: setting.og_description || "",
      og_image_url: setting.og_image_url || "",
      canonical_url: setting.canonical_url || "",
      robots: setting.robots || "index, follow",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.page_path.trim()) {
      toast.error("Page path is required");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        page_path: formData.page_path.trim(),
        title: formData.title || null,
        description: formData.description || null,
        keywords: formData.keywords,
        og_title: formData.og_title || null,
        og_description: formData.og_description || null,
        og_image_url: formData.og_image_url || null,
        canonical_url: formData.canonical_url || null,
        robots: formData.robots || "index, follow",
      };

      if (selectedSetting) {
        const { error } = await supabase
          .from("seo_settings")
          .update(dataToSave)
          .eq("id", selectedSetting.id);

        if (error) throw error;
        toast.success("SEO settings updated");
      } else {
        const { error } = await supabase
          .from("seo_settings")
          .insert(dataToSave);

        if (error) throw error;
        toast.success("SEO settings created");
      }

      setIsDialogOpen(false);
      fetchSeoSettings();
    } catch (error: any) {
      console.error("Error saving SEO settings:", error);
      toast.error(error.message || "Failed to save SEO settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("seo_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("SEO settings deleted");
      fetchSeoSettings();
    } catch (error) {
      console.error("Error deleting SEO settings:", error);
      toast.error("Failed to delete SEO settings");
    }
  };

  return (
    <AdminLayout title="SEO Settings">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">SEO Management</h2>
            <p className="text-slate-600">Manage SEO keywords and meta tags for search engines</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Page SEO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedSetting ? "Edit SEO Settings" : "Add New Page SEO"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Page Path */}
                <div className="space-y-2">
                  <Label htmlFor="page_path">Page Path *</Label>
                  <Input
                    id="page_path"
                    placeholder="e.g., / or /about or /blog"
                    value={formData.page_path}
                    onChange={(e) => setFormData({ ...formData, page_path: e.target.value })}
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title</Label>
                  <Input
                    id="title"
                    placeholder="SEO optimized page title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: Under 60 characters ({formData.title.length}/60)
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Meta Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description for search engine results"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: Under 160 characters ({formData.description.length}/160)
                  </p>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label>SEO Keywords (Unlimited)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a keyword and press Enter"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" onClick={handleAddKeyword} variant="secondary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1 py-1">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.keywords.length} keywords added
                  </p>
                </div>

                {/* Open Graph */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Open Graph (Social Sharing)</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="og_title">OG Title</Label>
                      <Input
                        id="og_title"
                        placeholder="Title for social media shares"
                        value={formData.og_title}
                        onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="og_description">OG Description</Label>
                      <Textarea
                        id="og_description"
                        placeholder="Description for social media shares"
                        value={formData.og_description}
                        onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="og_image_url">OG Image URL</Label>
                      <Input
                        id="og_image_url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.og_image_url}
                        onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Advanced Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="canonical_url">Canonical URL</Label>
                      <Input
                        id="canonical_url"
                        placeholder="https://example.com/page"
                        value={formData.canonical_url}
                        onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="robots">Robots Meta Tag</Label>
                      <Input
                        id="robots"
                        placeholder="index, follow"
                        value={formData.robots}
                        onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEO Settings List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : seoSettings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No SEO Settings</h3>
              <p className="text-muted-foreground">Add your first page SEO settings to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {seoSettings.map((setting) => (
              <Card key={setting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{setting.page_path}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(setting)}
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete SEO Settings?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the SEO settings for "{setting.page_path}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(setting.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {setting.title && (
                    <CardDescription className="mt-1">{setting.title}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {setting.description}
                    </p>
                  )}
                  {setting.keywords && setting.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {setting.keywords.slice(0, 10).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {setting.keywords.length > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          +{setting.keywords.length - 10} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
