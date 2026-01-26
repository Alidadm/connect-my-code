import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketplaceCategory } from "@/hooks/useMarketplace";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MarketplaceCategory[];
  onSuccess: () => void;
}

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const CreateListingDialog = ({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: CreateListingDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category_id: "",
    condition: "good" as const,
    location_city: "",
    location_region: "",
    allow_pickup: true,
    allow_shipping: false,
    shipping_price: "",
    contact_only: true,
    enable_checkout: false,
    hide_from_friends: false,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    const file = e.target.files[0];
    if (!file) return;

    if (images.length >= 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("marketplace-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("marketplace-images")
        .getPublicUrl(filePath);

      setImages([...images, urlData.publicUrl]);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (images.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("marketplace_listings").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price) || 0,
        category_id: formData.category_id || null,
        condition: formData.condition,
        location_city: formData.location_city.trim() || null,
        location_region: formData.location_region.trim() || null,
        allow_pickup: formData.allow_pickup,
        allow_shipping: formData.allow_shipping,
        shipping_price: formData.allow_shipping && formData.shipping_price
          ? parseFloat(formData.shipping_price)
          : null,
        contact_only: formData.contact_only,
        enable_checkout: formData.enable_checkout,
        hide_from_friends: formData.hide_from_friends,
        images,
        status: "active",
      });

      if (error) throw error;

      toast.success("Listing created successfully!");
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        category_id: "",
        condition: "good",
        location_city: "",
        location_region: "",
        allow_pickup: true,
        allow_shipping: false,
        shipping_price: "",
        contact_only: true,
        enable_checkout: false,
        hide_from_friends: false,
      });
      setImages([]);
      
      onSuccess();
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos (up to 10)</Label>
            <div className="grid grid-cols-4 gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {images.length < 10 && (
                <label className="aspect-square border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="What are you selling?"
              maxLength={100}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (enter 0 for free)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={formData.condition}
              onValueChange={(value: any) =>
                setFormData({ ...formData, condition: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((cond) => (
                  <SelectItem key={cond.value} value={cond.value}>
                    {cond.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your item..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.location_city}
                onChange={(e) =>
                  setFormData({ ...formData, location_city: e.target.value })
                }
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">State/Region</Label>
              <Input
                id="region"
                value={formData.location_region}
                onChange={(e) =>
                  setFormData({ ...formData, location_region: e.target.value })
                }
                placeholder="State/Region"
              />
            </div>
          </div>

          {/* Delivery Options */}
          <div className="space-y-3">
            <Label>Delivery Options</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pickup"
                checked={formData.allow_pickup}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_pickup: checked as boolean })
                }
              />
              <label htmlFor="pickup" className="text-sm cursor-pointer">
                Local pickup available
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="shipping"
                checked={formData.allow_shipping}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allow_shipping: checked as boolean })
                }
              />
              <label htmlFor="shipping" className="text-sm cursor-pointer">
                Shipping available
              </label>
            </div>
            {formData.allow_shipping && (
              <div className="pl-6">
                <Input
                  type="number"
                  value={formData.shipping_price}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_price: e.target.value })
                  }
                  placeholder="Shipping cost"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            <Label>Payment Options</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contact_only"
                checked={formData.contact_only}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, contact_only: checked as boolean })
                }
              />
              <label htmlFor="contact_only" className="text-sm cursor-pointer">
                Contact me for payment
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_checkout"
                checked={formData.enable_checkout}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enable_checkout: checked as boolean })
                }
              />
              <label htmlFor="enable_checkout" className="text-sm cursor-pointer">
                Enable in-app checkout
              </label>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="hide_friends"
              checked={formData.hide_from_friends}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, hide_from_friends: checked as boolean })
              }
            />
            <label htmlFor="hide_friends" className="text-sm cursor-pointer">
              Hide from friends
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Publish Listing"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
