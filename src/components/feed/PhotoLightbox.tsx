import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedSidebarGallery } from "@/hooks/useSavedSidebarGallery";
import { useTranslation } from "react-i18next";

interface PhotoMetadata {
  title: string | null;
  description: string | null;
}

interface PhotoLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorUsername?: string | null;
  photoMetadata?: PhotoMetadata[];
}

interface TouchPoint {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// Rubber band effect - resistance increases as you pull further
const rubberBand = (offset: number, limit: number, elasticity: number = 0.55): number => {
  const sign = offset < 0 ? -1 : 1;
  const absOffset = Math.abs(offset);
  // Diminishing returns formula for elastic feel
  return sign * limit * (1 - Math.exp(-absOffset / limit / elasticity));
};

export const PhotoLightbox = ({ 
  images, 
  initialIndex, 
  isOpen, 
  onClose,
  postId,
  authorDisplayName,
  authorAvatarUrl,
  authorUsername,
  photoMetadata
}: PhotoLightboxProps) => {
  const { t } = useTranslation();
  const { saveGalleryToSidebar, isGallerySaved } = useSavedSidebarGallery();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isSpringBack, setIsSpringBack] = useState(false);
  
  // Check if this gallery is already saved
  const hasMultipleImages = images.length >= 2;
  const gallerySaved = postId ? isGallerySaved(postId) : false;

  const handleSaveGallery = async () => {
    if (!postId || !hasMultipleImages) return;
    await saveGalleryToSidebar(postId, images, authorDisplayName, authorAvatarUrl, authorUsername);
  };
  
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
  
  // Image dimensions for boundary calculation
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Momentum state
  const velocityRef = useRef<Velocity>({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const minSwipeDistance = 50;
  const minZoom = 1;
  const maxZoom = 4;
  const friction = 0.92;
  const minVelocity = 0.5;
  const springTension = 0.15; // How fast spring animates back
  const springFriction = 0.75; // Damping for spring animation

  const isZoomed = zoomScale > 1;

  // Calculate pan boundaries based on zoom level
  const getBounds = useCallback((): Bounds => {
    if (!containerRef.current || imageDimensions.width === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    // Calculate the scaled image dimensions
    const scaledWidth = imageDimensions.width * zoomScale;
    const scaledHeight = imageDimensions.height * zoomScale;
    
    // Calculate how much the image exceeds the container
    const overflowX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const overflowY = Math.max(0, (scaledHeight - containerHeight) / 2);
    
    return {
      minX: -overflowX,
      maxX: overflowX,
      minY: -overflowY,
      maxY: overflowY,
    };
  }, [imageDimensions, zoomScale]);

  // Clamp value to bounds
  const clampToBounds = useCallback((offset: TouchPoint, bounds: Bounds): TouchPoint => {
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, offset.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, offset.y)),
    };
  }, []);

  // Check if offset is out of bounds
  const isOutOfBounds = useCallback((offset: TouchPoint, bounds: Bounds): boolean => {
    return (
      offset.x < bounds.minX ||
      offset.x > bounds.maxX ||
      offset.y < bounds.minY ||
      offset.y > bounds.maxY
    );
  }, []);

  // Apply elastic resistance when panning beyond bounds
  const applyElasticOffset = useCallback((offset: TouchPoint, bounds: Bounds): TouchPoint => {
    const maxElastic = 100; // Maximum elastic stretch in pixels
    let elasticX = offset.x;
    let elasticY = offset.y;

    if (offset.x < bounds.minX) {
      elasticX = bounds.minX + rubberBand(offset.x - bounds.minX, maxElastic);
    } else if (offset.x > bounds.maxX) {
      elasticX = bounds.maxX + rubberBand(offset.x - bounds.maxX, maxElastic);
    }

    if (offset.y < bounds.minY) {
      elasticY = bounds.minY + rubberBand(offset.y - bounds.minY, maxElastic);
    } else if (offset.y > bounds.maxY) {
      elasticY = bounds.maxY + rubberBand(offset.y - bounds.maxY, maxElastic);
    }

    return { x: elasticX, y: elasticY };
  }, []);

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Spring back animation to bounds
  const springBackToBounds = useCallback(() => {
    const bounds = getBounds();
    setIsSpringBack(true);
    
    const animate = () => {
      setPanOffset((prev) => {
        const target = clampToBounds(prev, bounds);
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        
        // Apply spring physics
        velocityRef.current = {
          x: (velocityRef.current.x + dx * springTension) * springFriction,
          y: (velocityRef.current.y + dy * springTension) * springFriction,
        };
        
        const newOffset = {
          x: prev.x + velocityRef.current.x,
          y: prev.y + velocityRef.current.y,
        };
        
        // Check if we've settled
        const settled = 
          Math.abs(dx) < 0.5 && 
          Math.abs(dy) < 0.5 && 
          Math.abs(velocityRef.current.x) < 0.5 && 
          Math.abs(velocityRef.current.y) < 0.5;
        
        if (settled) {
          animationFrameRef.current = null;
          setIsSpringBack(false);
          return target;
        }
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return newOffset;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [getBounds, clampToBounds]);

  // Apply momentum animation with boundary awareness
  const applyMomentum = useCallback(() => {
    const bounds = getBounds();
    
    const animate = () => {
      velocityRef.current = {
        x: velocityRef.current.x * friction,
        y: velocityRef.current.y * friction,
      };

      setPanOffset((prev) => {
        const newOffset = {
          x: prev.x + velocityRef.current.x,
          y: prev.y + velocityRef.current.y,
        };
        
        // Check if we've hit bounds - slow down faster and prepare for spring back
        if (isOutOfBounds(newOffset, bounds)) {
          velocityRef.current = {
            x: velocityRef.current.x * 0.5,
            y: velocityRef.current.y * 0.5,
          };
        }
        
        return newOffset;
      });

      // Stop when velocity is very small
      if (
        Math.abs(velocityRef.current.x) < minVelocity &&
        Math.abs(velocityRef.current.y) < minVelocity
      ) {
        animationFrameRef.current = null;
        // Check if we need to spring back
        setPanOffset((prev) => {
          if (isOutOfBounds(prev, bounds)) {
            springBackToBounds();
          }
          return prev;
        });
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [getBounds, isOutOfBounds, springBackToBounds]);

  // Handle image load to get dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Get the displayed size (respecting max-width/max-height constraints)
    setImageDimensions({
      width: img.clientWidth,
      height: img.clientHeight,
    });
  };

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
    cancelAnimation();
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsSpringBack(false);
    velocityRef.current = { x: 0, y: 0 };
  }, [currentIndex, cancelAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

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
    cancelAnimation();
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsSpringBack(false);
    velocityRef.current = { x: 0, y: 0 };
  }, [cancelAnimation]);

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
    cancelAnimation();
    setIsSpringBack(false);
    
    if (touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(touches[0], touches[1]);
      setInitialPinchDistance(distance);
      setInitialZoomScale(zoomScale);
      setIsPanning(false);
    } else if (touches.length === 1) {
      if (isZoomed) {
        setIsPanning(true);
        const point = { x: touches[0].clientX, y: touches[0].clientY };
        setLastPanPoint(point);
        lastMoveTimeRef.current = Date.now();
        velocityRef.current = { x: 0, y: 0 };
      } else {
        setTouchEnd(null);
        setTouchStart(touches[0].clientX);
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2 && initialPinchDistance !== null) {
      e.preventDefault();
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = (currentDistance / initialPinchDistance) * initialZoomScale;
      const clampedScale = Math.min(Math.max(scale, minZoom), maxZoom);
      setZoomScale(clampedScale);
      
      if (clampedScale <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (touches.length === 1) {
      if (isZoomed && isPanning && lastPanPoint) {
        e.preventDefault();
        const currentPoint = { x: touches[0].clientX, y: touches[0].clientY };
        const deltaX = currentPoint.x - lastPanPoint.x;
        const deltaY = currentPoint.y - lastPanPoint.y;
        
        // Calculate velocity for momentum
        const now = Date.now();
        const dt = now - lastMoveTimeRef.current;
        if (dt > 0) {
          const newVelocityX = deltaX / (dt / 16);
          const newVelocityY = deltaY / (dt / 16);
          velocityRef.current = {
            x: newVelocityX * 0.4 + velocityRef.current.x * 0.6,
            y: newVelocityY * 0.4 + velocityRef.current.y * 0.6,
          };
        }
        lastMoveTimeRef.current = now;
        
        // Apply elastic resistance when beyond bounds
        const bounds = getBounds();
        setPanOffset(prev => {
          const rawOffset = { x: prev.x + deltaX, y: prev.y + deltaY };
          return applyElasticOffset(rawOffset, bounds);
        });
        setLastPanPoint(currentPoint);
      } else if (!isZoomed && touchStart !== null) {
        const currentTouch = touches[0].clientX;
        setTouchEnd(currentTouch);
        
        const diff = currentTouch - touchStart;
        const maxOffset = window.innerWidth * 0.4;
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
        setSwipeOffset(clampedOffset);
      }
    }
  };

  const onTouchEnd = () => {
    if (initialPinchDistance !== null) {
      setInitialPinchDistance(null);
      // Check if we need to spring back after pinch
      const bounds = getBounds();
      if (isOutOfBounds(panOffset, bounds)) {
        springBackToBounds();
      }
      return;
    }
    
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      
      const bounds = getBounds();
      const outOfBounds = isOutOfBounds(panOffset, bounds);
      
      // If out of bounds, spring back immediately
      if (outOfBounds) {
        springBackToBounds();
      } else if (
        Math.abs(velocityRef.current.x) > minVelocity ||
        Math.abs(velocityRef.current.y) > minVelocity
      ) {
        // Otherwise apply momentum
        applyMomentum();
      }
      return;
    }
    
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
      className="fixed inset-0 z-50 bg-black flex items-center justify-center touch-none"
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

      {/* Save Gallery to Sidebar button */}
      {postId && hasMultipleImages && (
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-4 right-28 z-50 text-white hover:bg-white/20 h-10 w-10 ${gallerySaved ? 'text-primary' : ''}`}
          onClick={handleSaveGallery}
          title={gallerySaved ? t('gallery.alreadySaved', 'Gallery saved') : t('gallery.saveToSidebar', 'Save gallery to sidebar')}
        >
          <Images className={`h-5 w-5 ${gallerySaved ? 'fill-current' : ''}`} />
        </Button>
      )}

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

      {/* Image container with metadata */}
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div
          className="flex items-center justify-center w-full flex-1 px-12 sm:px-20"
          style={{
            transform: isZoomed 
              ? `translate(${panOffset.x}px, ${panOffset.y}px)` 
              : `translateX(${swipeOffset}px)`,
            transition: isSpringBack ? 'none' : (isPanning || initialPinchDistance !== null ? 'none' : 'transform 0.2s ease-out'),
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={handleDoubleTap}
        >
          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={photoMetadata?.[currentIndex]?.title || `Photo ${currentIndex + 1}`}
            className="max-w-full max-h-[70vh] object-contain select-none"
            style={{
              transform: `scale(${zoomScale})`,
              transition: initialPinchDistance !== null ? 'none' : 'transform 0.2s ease-out',
              cursor: isZoomed ? (isPanning ? "grabbing" : "grab") : "zoom-in",
            }}
            onClick={toggleZoom}
            onLoad={handleImageLoad}
            draggable={false}
          />
        </div>

        {/* Title and description below image */}
        {photoMetadata?.[currentIndex] && (photoMetadata[currentIndex].title || photoMetadata[currentIndex].description) && (
          <div className="w-full max-w-2xl px-6 pb-24 text-center">
            {photoMetadata[currentIndex].title && (
              <h3 className="text-white text-lg font-semibold mb-1">
                {photoMetadata[currentIndex].title}
              </h3>
            )}
            {photoMetadata[currentIndex].description && (
              <p className="text-white/80 text-sm whitespace-pre-wrap">
                {photoMetadata[currentIndex].description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
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
