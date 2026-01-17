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

// Map category icons to Lucide components
const getCategoryIcon = (iconName: string | null) => {
  // For simplicity, return a default icon
  return Building2;
};

export const BusinessManagement = () => {
  const { user } = useAuth();
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
      toast.error("Business name is required");
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
      title: "Delete Business?",
      text: "This will permanently remove your business profile. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
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
        {/* Cover Image */}
        <div
          className={cn(
            "h-32 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative cursor-pointer group",
            formData.cover_url && "bg-none"
          )}
          onClick={() => setCoverEditorOpen(true)}
        >
          {formData.cover_url && (
            <img
              src={formData.cover_url}
              alt="Business cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="secondary" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              {formData.cover_url ? "Change Cover" : "Add Cover"}
            </Button>
          </div>
        </div>

        {/* Business Icon */}
        <div className="absolute left-4 bottom-0 translate-y-1/2">
          <div className="h-16 w-16 rounded-xl bg-card border-4 border-background shadow-lg flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
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
        <div className="pt-12 pb-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {formData.name || "Your Business"}
              </h3>
              {selectedCategory && (
                <Badge variant="secondary" className="mt-1">
                  {selectedCategory.name}
                </Badge>
              )}
            </div>
            {business && (
              <Badge variant={formData.is_enabled ? "default" : "secondary"}>
                {formData.is_enabled ? "Visible" : "Hidden"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">Business Name *</Label>
          <Input
            id="business-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your business name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Business Category</Label>
          <Select
            value={formData.category_id || ""}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              category_id: value || null,
              custom_category: value ? null : prev.custom_category 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
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
              Phone (optional)
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
              Email (optional)
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
            Website URL (optional)
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
            Address (optional)
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
            <Label className="font-medium">Business Card</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCardUploaderOpen(true)}
          >
            {formData.business_card_url ? (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Change Card
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Add Card
              </>
            )}
          </Button>
        </div>
        
        {formData.business_card_url ? (
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={formData.business_card_url}
              alt="Business card"
              className="w-full h-auto"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 h-32 flex items-center justify-center text-muted-foreground text-sm">
            No business card added yet
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
          {business ? "Save Changes" : "Create Business"}
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
