import { useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

interface MasonryPhotoGridProps {
  images: string[];
  maxDisplay?: number;
  onImageClick?: (imageUrl: string, allImages: string[]) => void;
  variant?: "feed" | "gallery";
  // For gallery sidebar save feature
  postId?: string;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorUsername?: string | null;
}

export const MasonryPhotoGrid = ({ 
  images, 
  maxDisplay = 9, 
  onImageClick,
  variant = "feed",
  postId,
  authorDisplayName,
  authorAvatarUrl,
  authorUsername
}: MasonryPhotoGridProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const handleImageClick = (index: number) => {
    if (onImageClick) {
      onImageClick(images[index], images);
      return;
    }
    setLightboxIndex(index);
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
        <div className="columns-2 sm:columns-3 md:columns-4 gap-1 space-y-1">
          {images.map((url, index) => (
            <div
              key={index}
              className="break-inside-avoid rounded-md overflow-hidden bg-muted/20 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(index)}
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
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // Feed variant - structured layouts for posts
  const ImageTile = ({ 
    url, 
    index, 
    className = "", 
    showOverlay = false,
    overlayCount = 0 
  }: { 
    url: string; 
    index: number; 
    className?: string;
    showOverlay?: boolean;
    overlayCount?: number;
  }) => (
    <div
      className={`cursor-pointer overflow-hidden relative ${className}`}
      onClick={() => handleImageClick(index)}
    >
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
        loading="lazy"
      />
      {showOverlay && overlayCount > 0 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">+{overlayCount}</span>
        </div>
      )}
    </div>
  );

  // Single image - full width, object-contain for no cropping
  if (displayImages.length === 1) {
    return (
      <>
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
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 2 images - side by side
  if (displayImages.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          {displayImages.map((url, index) => (
            <ImageTile key={index} url={url} index={index} className="aspect-square" />
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 3 images - one large left, two stacked right
  if (displayImages.length === 3) {
    return (
      <>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden" style={{ height: '300px' }}>
          <ImageTile url={displayImages[0]} index={0} className="row-span-2 h-full" />
          <div className="grid grid-rows-2 gap-0.5 h-full">
            <ImageTile url={displayImages[1]} index={1} className="h-full" />
            <ImageTile url={displayImages[2]} index={2} className="h-full" />
          </div>
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 4 images - 2x2 grid
  if (displayImages.length === 4) {
    return (
      <>
        <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden">
          {displayImages.map((url, index) => (
            <ImageTile key={index} url={url} index={index} className="aspect-square" />
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 5 images - 2 on top, 3 on bottom
  if (displayImages.length === 5) {
    return (
      <>
        <div className="grid gap-0.5 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5">
            <ImageTile url={displayImages[0]} index={0} className="aspect-[4/3]" />
            <ImageTile url={displayImages[1]} index={1} className="aspect-[4/3]" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <ImageTile url={displayImages[2]} index={2} className="aspect-square" />
            <ImageTile url={displayImages[3]} index={3} className="aspect-square" />
            <ImageTile 
              url={displayImages[4]} 
              index={4} 
              className="aspect-square" 
              showOverlay={remainingCount > 0}
              overlayCount={remainingCount}
            />
          </div>
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 6 images - 3x2 grid
  if (displayImages.length === 6) {
    return (
      <>
        <div className="grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden">
          {displayImages.map((url, index) => (
            <ImageTile 
              key={index} 
              url={url} 
              index={index} 
              className="aspect-square"
              showOverlay={index === 5 && remainingCount > 0}
              overlayCount={remainingCount}
            />
          ))}
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 7 images - 1 large on top, 3+3 below
  if (displayImages.length === 7) {
    return (
      <>
        <div className="grid gap-0.5 rounded-lg overflow-hidden">
          <ImageTile url={displayImages[0]} index={0} className="aspect-[2/1]" />
          <div className="grid grid-cols-3 gap-0.5">
            <ImageTile url={displayImages[1]} index={1} className="aspect-square" />
            <ImageTile url={displayImages[2]} index={2} className="aspect-square" />
            <ImageTile url={displayImages[3]} index={3} className="aspect-square" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <ImageTile url={displayImages[4]} index={4} className="aspect-square" />
            <ImageTile url={displayImages[5]} index={5} className="aspect-square" />
            <ImageTile 
              url={displayImages[6]} 
              index={6} 
              className="aspect-square"
              showOverlay={remainingCount > 0}
              overlayCount={remainingCount}
            />
          </div>
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 8 images - 2 on top, 3+3 below
  if (displayImages.length === 8) {
    return (
      <>
        <div className="grid gap-0.5 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5">
            <ImageTile url={displayImages[0]} index={0} className="aspect-[4/3]" />
            <ImageTile url={displayImages[1]} index={1} className="aspect-[4/3]" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <ImageTile url={displayImages[2]} index={2} className="aspect-square" />
            <ImageTile url={displayImages[3]} index={3} className="aspect-square" />
            <ImageTile url={displayImages[4]} index={4} className="aspect-square" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <ImageTile url={displayImages[5]} index={5} className="aspect-square" />
            <ImageTile url={displayImages[6]} index={6} className="aspect-square" />
            <ImageTile 
              url={displayImages[7]} 
              index={7} 
              className="aspect-square"
              showOverlay={remainingCount > 0}
              overlayCount={remainingCount}
            />
          </div>
        </div>
        <PhotoLightbox
          images={images}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
          postId={postId}
          authorDisplayName={authorDisplayName}
          authorAvatarUrl={authorAvatarUrl}
          authorUsername={authorUsername}
        />
      </>
    );
  }

  // 9+ images - 3x3 grid with overlay on last
  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden">
        {displayImages.map((url, index) => (
          <ImageTile 
            key={index} 
            url={url} 
            index={index} 
            className="aspect-square"
            showOverlay={index === displayImages.length - 1 && remainingCount > 0}
            overlayCount={remainingCount}
          />
        ))}
      </div>
      <PhotoLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        postId={postId}
        authorDisplayName={authorDisplayName}
        authorAvatarUrl={authorAvatarUrl}
        authorUsername={authorUsername}
      />
    </>
  );
};