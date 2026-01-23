import { useState, useEffect } from "react";
import {
  Building2, Plus, Camera, Image, Phone, Mail, Globe, MapPin,
  Loader2, Save, Trash2, Eye, EyeOff, CreditCard, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  useUserBusiness,
  useBusinessCategories,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
  uploadBusinessMedia,
  Business,
} from "@/hooks/useBusiness";
import { BusinessCardUploader } from "./BusinessCardUploader";
import { BusinessCoverEditor } from "./BusinessCoverEditor";
import Swal from "sweetalert2";

// Default platform cover image (same as member profile default)
const DEFAULT_COVER_URL = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop";

// Map category icons to Lucide components
const getCategoryIcon = (iconName: string | null) => {
  // For simplicity, return a default icon
  return Building2;
};

export const BusinessManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: business, isLoading: loadingBusiness } = useUserBusiness();
  const { data: categories, isLoading: loadingCategories } = useBusinessCategories();
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const deleteBusiness = useDeleteBusiness();

  const [formData, setFormData] = useState<Partial<Business>>({
    name: "",
    category_id: null,
    custom_category: null,
    address: "",
    phone: "",
    email: "",
    website_url: "",
    cover_url: null,
    business_card_url: null,
    is_enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [cardUploaderOpen, setCardUploaderOpen] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);

  // Load existing business data
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name,
        category_id: business.category_id,
        custom_category: business.custom_category,
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        website_url: business.website_url || "",
        cover_url: business.cover_url,
        business_card_url: business.business_card_url,
        is_enabled: business.is_enabled,
      });
    }
  }, [business]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error(t("business.nameRequired"));
      return;
    }

    setSaving(true);
    try {
      if (business) {
        await updateBusiness.mutateAsync({
          id: business.id,
          ...formData,
        });
      } else {
        await createBusiness.mutateAsync(formData);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!business) return;

    const result = await Swal.fire({
      title: t("business.deleteTitle"),
      text: t("business.deleteWarning"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: t("business.confirmDelete"),
      cancelButtonText: t("common.cancel"),
    });

    if (result.isConfirmed) {
      await deleteBusiness.mutateAsync(business.id);
      setFormData({
        name: "",
        category_id: null,
        custom_category: null,
        address: "",
        phone: "",
        email: "",
        website_url: "",
        cover_url: null,
        business_card_url: null,
        is_enabled: true,
      });
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadBusinessMedia(user.id, file, "cover");
    setFormData(prev => ({ ...prev, cover_url: url }));
    
    // Auto-save if business exists
    if (business) {
      await updateBusiness.mutateAsync({
        id: business.id,
        cover_url: url,
      });
    }
  };

  const handleCardUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadBusinessMedia(user.id, file, "card");
    setFormData(prev => ({ ...prev, business_card_url: url }));
    
    // Auto-save if business exists
    if (business) {
      await updateBusiness.mutateAsync({
        id: business.id,
        business_card_url: url,
      });
    }
  };

  const selectedCategory = categories?.find(c => c.id === formData.category_id);

  if (loadingBusiness || loadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card with Cover */}
      <div className="relative rounded-xl overflow-hidden border border-border">
        {/* Cover Image - always show default if no custom cover */}
        <div
          className="h-32 relative cursor-pointer group"
          onClick={() => setCoverEditorOpen(true)}
        >
          <img
            src={formData.cover_url || DEFAULT_COVER_URL}
            alt="Business cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="secondary" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              {formData.cover_url ? t("business.changeCover") : t("business.addCover")}
            </Button>
          </div>
        </div>

        {/* Toggle */}
        <div className="absolute right-4 top-4">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5">
            {formData.is_enabled ? (
              <Eye className="h-4 w-4 text-emerald-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>
        </div>

        {/* Title area */}
        <div className="pt-4 pb-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {formData.name || t("business.yourBusiness")}
              </h3>
              {selectedCategory && (
                <Badge variant="secondary" className="mt-1">
                  {selectedCategory.name}
                </Badge>
              )}
            </div>
            {business && (
              <Badge variant={formData.is_enabled ? "default" : "secondary"}>
                {formData.is_enabled ? t("business.visible") : t("business.hidden")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">{t("business.businessName")} *</Label>
          <Input
            id="business-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t("business.enterBusinessName")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("business.businessCategory")}</Label>
          <Select
            value={formData.category_id || ""}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              category_id: value || null,
              custom_category: value ? null : prev.custom_category 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("business.selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business-phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t("business.phone")}
            </Label>
            <Input
              id="business-phone"
              value={formData.phone || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t("business.email")}
            </Label>
            <Input
              id="business-email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contact@business.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business-website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("business.websiteUrl")}
          </Label>
          <Input
            id="business-website"
            value={formData.website_url || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
            placeholder="https://www.yourbusiness.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="business-address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t("business.address")}
          </Label>
          <Input
            id="business-address"
            value={formData.address || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="123 Business St, City, Country"
          />
        </div>
      </div>

      {/* Business Card Section */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <Label className="font-medium">{t("business.businessCard")}</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCardUploaderOpen(true)}
          >
            {formData.business_card_url ? (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                {t("business.changeCard")}
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {t("business.addCard")}
              </>
            )}
          </Button>
        </div>
        
        {formData.business_card_url ? (
          <div className="rounded-lg overflow-hidden border border-border bg-muted/10">
            <img
              src={formData.business_card_url}
              alt="Business card"
              className="w-full h-auto min-h-[200px] object-contain"
              style={{ 
                imageRendering: "-webkit-optimize-contrast",
                maxHeight: "400px"
              }}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 h-32 flex items-center justify-center text-muted-foreground text-sm">
            {t("business.noCardAdded")}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {business ? t("profile.saveChanges") : t("business.createBusiness")}
        </Button>
        
        {business && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <BusinessCardUploader
        open={cardUploaderOpen}
        onOpenChange={setCardUploaderOpen}
        onUpload={handleCardUpload}
        currentCardUrl={formData.business_card_url}
      />
      
      <BusinessCoverEditor
        open={coverEditorOpen}
        onOpenChange={setCoverEditorOpen}
        onUpload={handleCoverUpload}
        currentCoverUrl={formData.cover_url}
      />
    </div>
  );
};
