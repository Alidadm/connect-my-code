import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bookmark, Camera, Images, X } from "lucide-react";
import { usePlatformPhotos } from "@/hooks/usePlatformPhotos";
import { PhotoLightbox } from "./PhotoLightbox";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const PLATFORM_GALLERY_HIDDEN_KEY = "platformGalleryHidden";

interface PlatformPhoto {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
}

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
  const displayImages = imageUrls.slice(0, 9);
  const remainingCount = imageUrls.length - 9;

  // Get the first photo's title as the gallery title, or use default
  const galleryTitle = photos[0]?.title || t("gallery.platformGallery", "Platform Gallery");

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const ImageTile = ({ 
    url, 
    index, 
    className = "", 
    showOverlay = false,
    overlayCount = 0,
    photoId,
  }: { 
    url: string; 
    index: number; 
    className?: string;
    showOverlay?: boolean;
    overlayCount?: number;
    photoId: string;
  }) => {
    const isSaved = savedPhotoIds.has(photoId);
    
    return (
      <div
        className={`cursor-pointer overflow-hidden relative group ${className}`}
        onClick={() => handleImageClick(index)}
      >
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        {/* Save button overlay */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-1 right-1 h-7 w-7 bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity",
            isSaved && "opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleSave(photoId);
          }}
        >
          <Bookmark className={cn("h-4 w-4 text-white", isSaved && "fill-white")} />
        </Button>
        {showOverlay && overlayCount > 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">+{overlayCount}</span>
          </div>
        )}
      </div>
    );
  };

  // Prepare photo metadata for lightbox
  const photoMetadata = photos.map(p => ({
    title: p.title,
    description: p.description,
  }));

  const GalleryHeader = () => (
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {photos.length === 1 ? <Camera className="h-5 w-5" /> : <Images className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">
              {galleryTitle}
            </span>
            <span className="text-primary text-xs">✓</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {photos.length === 1 
              ? t("gallery.officialPhotos", "Official photos")
              : `${photos.length} ${t("gallery.photos", "photos")}`
            }
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
  );

  // Single image layout
  if (displayImages.length === 1) {
    return (
      <>
        <Card>
          <GalleryHeader />
          <hr className="border-border mb-3" />
          <CardContent className="pt-0">
            <div 
              className="rounded-lg overflow-hidden cursor-pointer bg-muted/20"
              onClick={() => handleImageClick(0)}
            >
              <img
                src={displayImages[0]}
                alt=""
                className="w-full max-h-[500px] object-contain hover:opacity-95 transition-opacity mx-auto"
                loading="lazy"
              />
            </div>
          </CardContent>
        </Card>
        <PhotoLightbox
          images={imageUrls}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoMetadata={photoMetadata}
        />
      </>
    );
  }

  // 2 images - side by side
  if (displayImages.length === 2) {
    return (
      <>
        <Card>
          <GalleryHeader />
          <hr className="border-border mb-3" />
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
              {displayImages.map((url, index) => (
                <ImageTile 
                  key={photos[index].id} 
                  url={url} 
                  index={index} 
                  className="aspect-square" 
                  photoId={photos[index].id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <PhotoLightbox
          images={imageUrls}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoMetadata={photoMetadata}
        />
      </>
    );
  }

  // 3 images
  if (displayImages.length === 3) {
    return (
      <>
        <Card>
          <GalleryHeader />
          <hr className="border-border mb-3" />
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden" style={{ height: '300px' }}>
              <ImageTile url={displayImages[0]} index={0} className="row-span-2 h-full" photoId={photos[0].id} />
              <div className="grid grid-rows-2 gap-0.5 h-full">
                <ImageTile url={displayImages[1]} index={1} className="h-full" photoId={photos[1].id} />
                <ImageTile url={displayImages[2]} index={2} className="h-full" photoId={photos[2].id} />
              </div>
            </div>
          </CardContent>
        </Card>
        <PhotoLightbox
          images={imageUrls}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoMetadata={photoMetadata}
        />
      </>
    );
  }

  // 4 images - 2x2 grid
  if (displayImages.length === 4) {
    return (
      <>
        <Card>
          <GalleryHeader />
          <hr className="border-border mb-3" />
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
              {displayImages.map((url, index) => (
                <ImageTile key={photos[index].id} url={url} index={index} className="aspect-square" photoId={photos[index].id} />
              ))}
            </div>
          </CardContent>
        </Card>
        <PhotoLightbox
          images={imageUrls}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoMetadata={photoMetadata}
        />
      </>
    );
  }

  // 5+ images - 3x3 grid with overlay
  return (
    <>
      <Card>
        <GalleryHeader />
        <hr className="border-border mb-3" />
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden">
            {displayImages.map((url, index) => (
              <ImageTile 
                key={photos[index].id} 
                url={url} 
                index={index} 
                className="aspect-square"
                showOverlay={index === displayImages.length - 1 && remainingCount > 0}
                overlayCount={remainingCount}
                photoId={photos[index].id}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <PhotoLightbox
        images={imageUrls}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photoMetadata={photoMetadata}
      />
    </>
  );
};
