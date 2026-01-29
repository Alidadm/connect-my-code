import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAdminPlatformPhotos } from "@/hooks/usePlatformPhotos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ImageOff, Upload, Eye, EyeOff, GripVertical } from "lucide-react";

interface EditPhotoData {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

const PlatformGallery = () => {
  const { photos, loading, addPhoto, updatePhoto, deletePhoto } = useAdminPlatformPhotos();
  const [uploading, setUploading] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<EditPhotoData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.warning(`${files.length - imageFiles.length} non-image file(s) were skipped`);
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of imageFiles) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `platform-gallery/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("post-media")
            .getPublicUrl(filePath);

          await addPhoto(publicUrl);
          successCount++;
        } catch (error) {
          console.error("Upload error for file:", file.name, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} photo${failCount > 1 ? 's' : ''} failed to upload`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openEditDialog = (photo: typeof photos[0]) => {
    setEditData({
      id: photo.id,
      title: photo.title || "",
      description: photo.description || "",
      is_active: photo.is_active,
      display_order: photo.display_order,
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    updatePhoto(editData.id, {
      title: editData.title || undefined,
      description: editData.description || undefined,
      is_active: editData.is_active,
      display_order: editData.display_order,
    });
    setEditDialog(false);
    setEditData(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      deletePhoto(id);
    }
  };

  const toggleActive = (photo: typeof photos[0]) => {
    updatePhoto(photo.id, { is_active: !photo.is_active });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Platform Gallery</h1>
            <p className="text-muted-foreground">
              Manage photos displayed in the member feed
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Add Photos"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No photos yet. Click "Add Photo" to upload your first image.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className={`overflow-hidden ${!photo.is_active ? "opacity-50" : ""}`}>
                <div className="relative aspect-square">
                  <img
                    src={photo.image_url}
                    alt={photo.title || "Gallery photo"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {photo.is_active ? (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">Active</span>
                    ) : (
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">Hidden</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => toggleActive(photo)}
                    >
                      {photo.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white"
                      onClick={() => openEditDialog(photo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Title overlay */}
                  {photo.title && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium truncate">
                        {photo.title}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Photo</DialogTitle>
            </DialogHeader>
            {editData && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="Photo title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Photo description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={editData.display_order}
                    onChange={(e) => setEditData({ ...editData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={editData.is_active}
                    onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                  />
                  <Label htmlFor="active">Visible to members</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default PlatformGallery;
