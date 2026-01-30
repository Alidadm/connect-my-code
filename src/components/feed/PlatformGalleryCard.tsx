import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bookmark, Camera, X } from "lucide-react";
import { usePlatformPhotos } from "@/hooks/usePlatformPhotos";
import { PhotoLightbox } from "./PhotoLightbox";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const PLATFORM_GALLERY_HIDDEN_KEY = "platformGalleryHidden";

export const PlatformGalleryCard = () => {
  const { t } = useTranslation();
  const { photos, savedPhotoIds, loading, toggleSave } = usePlatformPhotos();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem(PLATFORM_GALLERY_HIDDEN_KEY) === "true";
  });

  const handleHideGallery = () => {
    localStorage.setItem(PLATFORM_GALLERY_HIDDEN_KEY, "true");
    setIsHidden(true);
    window.dispatchEvent(new CustomEvent("platform-gallery-visibility-changed"));
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsHidden(localStorage.getItem(PLATFORM_GALLERY_HIDDEN_KEY) === "true");
    };
    window.addEventListener("platform-gallery-visibility-changed", handleVisibilityChange);
    return () => window.removeEventListener("platform-gallery-visibility-changed", handleVisibilityChange);
  }, []);

  if (isHidden || loading || photos.length === 0) return null;

  const imageUrls = photos.map(p => p.image_url);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Render each photo as an individual card/post
  return (
    <>
      {photos.map((photo, index) => {
        const isSaved = savedPhotoIds.has(photo.id);
        
        return (
          <Card key={photo.id} className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Camera className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">
                      {photo.title || t("gallery.untitled", "Untitled")}
                    </span>
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("gallery.officialPost", "Official post")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleHideGallery}
                  title={t("gallery.hideGallery", "Hide gallery")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <hr className="border-border mb-3" />
            <CardContent className="pt-0 space-y-3">
              {/* Description text */}
              {photo.description && (
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {photo.description}
                </p>
              )}
              
              {/* Image */}
              <div 
                className="relative rounded-lg overflow-hidden cursor-pointer bg-muted/20 group"
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={photo.image_url}
                  alt={photo.title || ""}
                  className="w-full max-h-[500px] object-contain hover:opacity-95 transition-opacity mx-auto"
                  loading="lazy"
                />
                {/* Save button overlay */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity",
                    isSaved && "opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(photo.id);
                  }}
                >
                  <Bookmark className={cn("h-4 w-4 text-white", isSaved && "fill-white")} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      <PhotoLightbox
        images={imageUrls}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
