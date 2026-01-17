import { useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

interface MasonryPhotoGridProps {
  images: string[];
  maxDisplay?: number;
  onImageClick?: (imageUrl: string, allImages: string[]) => void;
  variant?: "feed" | "gallery";
}

export const MasonryPhotoGrid = ({ 
  images, 
  maxDisplay = 5, 
  onImageClick,
  variant = "feed" 
}: MasonryPhotoGridProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const handleImageClick = (imageUrl: string) => {
    if (onImageClick) {
      onImageClick(imageUrl, images);
      return;
    }

    // Open lightbox
    const index = images.indexOf(imageUrl);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  if (images.length === 0) return null;

  // Gallery variant - true masonry layout
  if (variant === "gallery") {
    return (
      <>
        <div className="columns-2 sm:columns-3 md:columns-4 gap-2 space-y-2">
          {images.map((url, index) => (
            <div
              key={index}
              className="break-inside-avoid rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(url)}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  // Feed variant - structured masonry for posts
  if (displayImages.length === 1) {
    return (
      <>
        <div 
          className="rounded-lg overflow-hidden cursor-pointer"
          onClick={() => handleImageClick(displayImages[0])}
        >
          <img
            src={displayImages[0]}
            alt=""
            className="w-full max-h-[500px] object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  if (displayImages.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {displayImages.map((url, index) => (
            <div
              key={index}
              className="aspect-square cursor-pointer overflow-hidden"
              onClick={() => handleImageClick(url)}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  if (displayImages.length === 3) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          <div
            className="row-span-2 cursor-pointer overflow-hidden"
            onClick={() => handleImageClick(displayImages[0])}
          >
            <img
              src={displayImages[0]}
              alt=""
              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
              loading="lazy"
            />
          </div>
          {displayImages.slice(1).map((url, index) => (
            <div
              key={index}
              className="aspect-square cursor-pointer overflow-hidden"
              onClick={() => handleImageClick(url)}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  if (displayImages.length === 4) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {displayImages.map((url, index) => (
            <div
              key={index}
              className="aspect-square cursor-pointer overflow-hidden"
              onClick={() => handleImageClick(url)}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />
      </>
    );
  }

  // 5+ images - masonry with overlay for remaining
  return (
    <>
      <div className="grid grid-cols-6 gap-1 rounded-lg overflow-hidden">
        {/* Large image on left */}
        <div
          className="col-span-3 row-span-2 cursor-pointer overflow-hidden"
          onClick={() => handleImageClick(displayImages[0])}
        >
          <img
            src={displayImages[0]}
            alt=""
            className="w-full h-full object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </div>
        {/* Top right */}
        <div
          className="col-span-3 cursor-pointer overflow-hidden aspect-video"
          onClick={() => handleImageClick(displayImages[1])}
        >
          <img
            src={displayImages[1]}
            alt=""
            className="w-full h-full object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </div>
        {/* Bottom row - 3 small images */}
        {displayImages.slice(2, 5).map((url, index) => (
          <div
            key={index}
            className={`cursor-pointer overflow-hidden aspect-square relative ${
              index === 2 && remainingCount > 0 ? '' : ''
            }`}
            onClick={() => handleImageClick(url)}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
              loading="lazy"
            />
            {/* Show remaining count overlay on last visible image */}
            {index === 2 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <PhotoLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
      />
    </>
  );
};
