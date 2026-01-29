import { useState } from "react";
import { Images, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSavedSidebarGallery } from "@/hooks/useSavedSidebarGallery";
import { PhotoLightbox } from "@/components/feed/PhotoLightbox";
import Swal from "sweetalert2";

export const SavedGalleryWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { savedGallery, loading, removeGalleryFromSidebar } = useSavedSidebarGallery();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (loading || !savedGallery) {
    return null;
  }

  const images = savedGallery.media_urls || [];
  const displayImages = images.slice(0, 4);
  const remainingCount = Math.max(0, images.length - 4);

  const handleRemove = async () => {
    const result = await Swal.fire({
      title: t('gallery.removeFromSidebar', 'Remove Gallery?'),
      text: t('gallery.removeFromSidebarConfirm', 'This gallery will be removed from your sidebar.'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.remove', 'Remove'),
      cancelButtonText: t('common.cancel', 'Cancel'),
    });

    if (result.isConfirmed) {
      await removeGalleryFromSidebar(savedGallery.id);
    }
  };

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleViewPost = () => {
    navigate(`/post/${savedGallery.post_id}`);
  };

  return (
    <div className="bg-card rounded-xl p-4 mb-4 border border-border">
      {/* Widget Header with left gradient border like other sidebar widgets */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-1 h-6 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, #5682e8, transparent)',
          }}
        />
        <Images className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1">
          {t('gallery.savedGallery', 'Saved Gallery')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <hr className="border-border mb-3" />

      {/* Gallery Grid */}
      <div 
        className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden cursor-pointer"
        onClick={() => handleImageClick(0)}
      >
        {displayImages.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square overflow-hidden bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick(index);
            }}
          >
            <img
              src={url}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Author Info */}
      {savedGallery.author_display_name && (
        <button
          onClick={handleViewPost}
          className="flex items-center gap-2 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <span className="truncate">
            {t('gallery.from', 'From')} {savedGallery.author_display_name}
          </span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      )}

      {/* Lightbox */}
      <PhotoLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
