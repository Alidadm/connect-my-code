import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface SavedGallery {
  id: string;
  post_id: string;
  media_urls: string[];
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_username: string | null;
  created_at: string;
}

export const useSavedSidebarGallery = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [savedGallery, setSavedGallery] = useState<SavedGallery | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSavedGallery = useCallback(async () => {
    if (!user) {
      setSavedGallery(null);
      setLoading(false);
      return;
    }

    try {
      // Get the most recently saved gallery
      const { data, error } = await supabase
        .from("saved_sidebar_galleries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSavedGallery(data);
    } catch (error) {
      console.error("Error fetching saved gallery:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedGallery();
  }, [fetchSavedGallery]);

  const saveGalleryToSidebar = async (
    postId: string,
    mediaUrls: string[],
    authorDisplayName?: string | null,
    authorAvatarUrl?: string | null,
    authorUsername?: string | null
  ) => {
    if (!user) {
      toast({
        title: t('auth.loginRequired', 'Login required'),
        description: t('auth.loginToSave', 'Please log in to save galleries.'),
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from("saved_sidebar_galleries").upsert({
        user_id: user.id,
        post_id: postId,
        media_urls: mediaUrls,
        author_display_name: authorDisplayName || null,
        author_avatar_url: authorAvatarUrl || null,
        author_username: authorUsername || null,
      }, { onConflict: 'user_id,post_id' });

      if (error) throw error;

      toast({
        title: t('gallery.savedToSidebar', 'Gallery saved to sidebar'),
        description: t('gallery.savedToSidebarDesc', 'This gallery will now appear in your sidebar.'),
      });

      await fetchSavedGallery();
      return true;
    } catch (error) {
      console.error("Error saving gallery:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('gallery.saveFailed', 'Failed to save gallery.'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeGalleryFromSidebar = async (galleryId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("saved_sidebar_galleries")
        .delete()
        .eq("id", galleryId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t('gallery.removedFromSidebar', 'Gallery removed'),
        description: t('gallery.removedFromSidebarDesc', 'The gallery has been removed from your sidebar.'),
      });

      setSavedGallery(null);
      return true;
    } catch (error) {
      console.error("Error removing gallery:", error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const isGallerySaved = useCallback((postId: string) => {
    return savedGallery?.post_id === postId;
  }, [savedGallery]);

  return {
    savedGallery,
    loading,
    saveGalleryToSidebar,
    removeGalleryFromSidebar,
    isGallerySaved,
    refetch: fetchSavedGallery,
  };
};
