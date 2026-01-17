import { useState } from "react";
import Swal from "sweetalert2";

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
  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const handleImageClick = (imageUrl: string) => {
    if (onImageClick) {
      onImageClick(imageUrl, images);
      return;
    }

    // Default lightbox behavior
    let currentIndex = images.indexOf(imageUrl);
    
    const showImage = (index: number) => {
      currentIndex = index;
      const hasMultiple = images.length > 1;
      const hasPrev = currentIndex > 0;
      const hasNext = currentIndex < images.length - 1;
      
      Swal.fire({
        html: `
          <div class="relative flex items-center justify-center min-h-[50vh]">
            ${hasMultiple && hasPrev ? `
              <button id="swal-prev-btn" class="absolute left-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            ` : ''}
            <img src="${images[currentIndex]}" alt="Photo" class="max-h-[80vh] max-w-[85vw] object-contain rounded-lg" />
            ${hasMultiple && hasNext ? `
              <button id="swal-next-btn" class="absolute right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ` : ''}
            ${hasMultiple ? `
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                ${currentIndex + 1} / ${images.length}
              </div>
            ` : ''}
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto',
        padding: '0.5rem',
        background: 'rgba(0, 0, 0, 0.9)',
        customClass: {
          popup: 'swal-image-popup',
          closeButton: 'text-white hover:text-gray-300',
        },
        showClass: {
          popup: 'animate__animated animate__fadeIn animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOut animate__faster'
        },
        didOpen: () => {
          const prevBtn = document.getElementById('swal-prev-btn');
          const nextBtn = document.getElementById('swal-next-btn');
          
          prevBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
              Swal.close();
              setTimeout(() => showImage(currentIndex - 1), 50);
            }
          });
          
          nextBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex < images.length - 1) {
              Swal.close();
              setTimeout(() => showImage(currentIndex + 1), 50);
            }
          });

          // Keyboard navigation
          const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
              Swal.close();
              setTimeout(() => showImage(currentIndex - 1), 50);
            } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
              Swal.close();
              setTimeout(() => showImage(currentIndex + 1), 50);
            }
          };
          document.addEventListener('keydown', handleKeydown);
          
          // Cleanup on close
          const popup = Swal.getPopup();
          if (popup) {
            const observer = new MutationObserver(() => {
              if (!document.body.contains(popup)) {
                document.removeEventListener('keydown', handleKeydown);
                observer.disconnect();
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          }
        },
      });
    };
    
    showImage(currentIndex);
  };

  if (images.length === 0) return null;

  // Gallery variant - true masonry layout
  if (variant === "gallery") {
    return (
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
    );
  }

  // Feed variant - structured masonry for posts
  if (displayImages.length === 1) {
    return (
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
    );
  }

  if (displayImages.length === 2) {
    return (
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
    );
  }

  if (displayImages.length === 3) {
    return (
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
    );
  }

  if (displayImages.length === 4) {
    return (
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
    );
  }

  // 5+ images - masonry with overlay for remaining
  return (
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
  );
};
