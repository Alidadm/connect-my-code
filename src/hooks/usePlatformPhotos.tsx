import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface PlatformPhoto {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  created_at: string;
  display_order: number;
  is_active: boolean;
}

export const usePlatformPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PlatformPhoto[]>([]);
  const [savedPhotoIds, setSavedPhotoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_photos")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching platform photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPhotos = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_platform_photos")
        .select("photo_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setSavedPhotoIds(new Set(data?.map(s => s.photo_id) || []));
    } catch (error) {
      console.error("Error fetching saved photos:", error);
    }
  };

  const savePhoto = async (photoId: string) => {
    if (!user) {
      toast.error("Please log in to save photos");
      return;
    }

    try {
      const { error } = await supabase
        .from("saved_platform_photos")
        .insert({ user_id: user.id, photo_id: photoId });

      if (error) throw error;
      setSavedPhotoIds(prev => new Set([...prev, photoId]));
      toast.success("Photo saved!");
    } catch (error) {
      console.error("Error saving photo:", error);
      toast.error("Failed to save photo");
    }
  };

  const unsavePhoto = async (photoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("saved_platform_photos")
        .delete()
        .eq("user_id", user.id)
        .eq("photo_id", photoId);

      if (error) throw error;
      setSavedPhotoIds(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      toast.success("Photo removed from saved");
    } catch (error) {
      console.error("Error unsaving photo:", error);
      toast.error("Failed to remove photo");
    }
  };

  const toggleSave = async (photoId: string) => {
    if (savedPhotoIds.has(photoId)) {
      await unsavePhoto(photoId);
    } else {
      await savePhoto(photoId);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    fetchSavedPhotos();
  }, [user]);

  return {
    photos,
    savedPhotoIds,
    loading,
    toggleSave,
    refetch: fetchPhotos,
  };
};

export const useAdminPlatformPhotos = () => {
  const [photos, setPhotos] = useState<PlatformPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_photos")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching all platform photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPhoto = async (imageUrl: string, title?: string, description?: string) => {
    try {
      const { error } = await supabase
        .from("platform_photos")
        .insert({
          image_url: imageUrl,
          title: title || null,
          description: description || null,
        });

      if (error) throw error;
      toast.success("Photo added successfully");
      fetchAllPhotos();
    } catch (error) {
      console.error("Error adding photo:", error);
      toast.error("Failed to add photo");
    }
  };

  const updatePhoto = async (id: string, updates: { title?: string; description?: string; is_active?: boolean; display_order?: number }) => {
    try {
      const { error } = await supabase
        .from("platform_photos")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast.success("Photo updated");
      fetchAllPhotos();
    } catch (error) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update photo");
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      const { error } = await supabase
        .from("platform_photos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Photo deleted");
      fetchAllPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  useEffect(() => {
    fetchAllPhotos();
  }, []);

  return {
    photos,
    loading,
    addPhoto,
    updatePhoto,
    deletePhoto,
    refetch: fetchAllPhotos,
  };
};
