import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getMidpoint = (touch1: React.Touch, touch2: React.Touch): TouchPoint => ({
  x: (touch1.clientX + touch2.clientX) / 2,
  y: (touch1.clientY + touch2.clientY) / 2,
});

export const PhotoLightbox = ({ images, initialIndex, isOpen, onClose }: PhotoLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  // Pinch zoom state
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoomScale, setInitialZoomScale] = useState(1);
  
  // Pan state (when zoomed)
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<TouchPoint | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const minZoom = 1;
  const maxZoom = 4;

  const isZoomed = zoomScale > 1;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset zoom when changing images
  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          resetZoom();
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft" && !isZoomed) {
        goToPrevious();
      } else if (e.key === "ArrowRight" && !isZoomed) {
        goToNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, isZoomed]);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2) {
      // Pinch zoom start
      e.preventDefault();
      const distance = getDistance(touches[0], touches[1]);
      setInitialPinchDistance(distance);
      setInitialZoomScale(zoomScale);
      setIsPanning(false);
    } else if (touches.length === 1) {
      if (isZoomed) {
        // Start panning when zoomed
        setIsPanning(true);
        setLastPanPoint({ x: touches[0].clientX, y: touches[0].clientY });
      } else {
        // Start swipe gesture
        setTouchEnd(null);
        setTouchStart(touches[0].clientX);
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2 && initialPinchDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = (currentDistance / initialPinchDistance) * initialZoomScale;
      const clampedScale = Math.min(Math.max(scale, minZoom), maxZoom);
      setZoomScale(clampedScale);
      
      // Reset pan if zooming out to 1x
      if (clampedScale <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (touches.length === 1) {
      if (isZoomed && isPanning && lastPanPoint) {
        // Pan the zoomed image
        e.preventDefault();
        const deltaX = touches[0].clientX - lastPanPoint.x;
        const deltaY = touches[0].clientY - lastPanPoint.y;
        
        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        setLastPanPoint({ x: touches[0].clientX, y: touches[0].clientY });
      } else if (!isZoomed && touchStart !== null) {
        // Swipe gesture
        const currentTouch = touches[0].clientX;
        setTouchEnd(currentTouch);
        
        const diff = currentTouch - touchStart;
        const maxOffset = window.innerWidth * 0.4;
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
        setSwipeOffset(clampedOffset);
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // Reset pinch state
    if (initialPinchDistance !== null) {
      setInitialPinchDistance(null);
      return;
    }
    
    // Reset pan state
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    
    // Handle swipe
    setSwipeOffset(0);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < images.length - 1) {
      goToNext();
    } else if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const toggleZoom = () => {
    if (isZoomed) {
      resetZoom();
    } else {
      setZoomScale(2);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  // Double-tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      toggleZoom();
    }
    lastTapRef.current = now;
  };

  if (!isOpen) return null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center touch-none"
      onClick={handleBackdropClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 h-10 w-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Zoom button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-16 z-50 text-white hover:bg-white/20 h-10 w-10"
        onClick={toggleZoom}
      >
        {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
      </Button>

      {/* Zoom level indicator */}
      {isZoomed && (
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
          {Math.round(zoomScale * 100)}%
        </div>
      )}

      {/* Previous button */}
      {hasPrevious && !isZoomed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 sm:left-4 z-50 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
        >
          <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
        </Button>
      )}

      {/* Next button */}
      {hasNext && !isZoomed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 sm:right-4 z-50 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
        >
          <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
        </Button>
      )}

      {/* Image container with swipe animation */}
      <div
        ref={imageContainerRef}
        className="flex items-center justify-center w-full h-full px-12 sm:px-20 transition-transform duration-200 ease-out"
        style={{
          transform: isZoomed 
            ? `translate(${panOffset.x}px, ${panOffset.y}px)` 
            : `translateX(${swipeOffset}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={handleDoubleTap}
      >
        <img
          src={images[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${zoomScale})`,
            cursor: isZoomed ? "grab" : "zoom-in",
          }}
          onClick={toggleZoom}
          draggable={false}
        />
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Dot indicators for mobile */}
      {images.length > 1 && images.length <= 10 && !isZoomed && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/40"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      )}

      {/* Swipe/pinch hint for mobile */}
      {!isZoomed && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:hidden animate-pulse">
          Swipe to navigate • Pinch to zoom
        </div>
      )}
    </div>
  );
};
