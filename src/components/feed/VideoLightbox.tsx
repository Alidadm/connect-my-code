import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  PictureInPicture2,
  PictureInPictureIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoLightboxProps {
  videos: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const VideoLightbox = ({
  videos,
  initialIndex,
  isOpen,
  onClose,
}: VideoLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  
  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoading(true);
      // Check PiP support
      setIsPiPSupported(document.pictureInPictureEnabled ?? false);
    }
  }, [isOpen, currentIndex]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          if (e.shiftKey) {
            goToPrevious();
          } else {
            skip(-10);
          }
          break;
        case "ArrowRight":
          if (e.shiftKey) {
            goToNext();
          } else {
            skip(10);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case "m":
          setIsMuted((m) => !m);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "p":
          togglePiP();
          break;
        case ",":
        case "<":
          // Decrease playback speed
          setPlaybackSpeed((current) => {
            const currentIdx = playbackSpeeds.indexOf(current);
            const prevIdx = currentIdx > 0 ? currentIdx - 1 : 0;
            return playbackSpeeds[prevIdx];
          });
          break;
        case ".":
        case ">":
          // Increase playback speed
          setPlaybackSpeed((current) => {
            const currentIdx = playbackSpeeds.indexOf(current);
            const nextIdx = currentIdx < playbackSpeeds.length - 1 ? currentIdx + 1 : playbackSpeeds.length - 1;
            return playbackSpeeds[nextIdx];
          });
          break;
        case "Escape":
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  // Apply volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      );
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Exit fullscreen error:", err);
      }
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const cyclePlaybackSpeed = () => {
    const currentIdx = playbackSpeeds.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % playbackSpeeds.length;
    setPlaybackSpeed(playbackSpeeds[nextIdx]);
  };

  // Generate thumbnail for hover preview
  const generateThumbnail = useCallback((time: number) => {
    const thumbnailVideo = thumbnailVideoRef.current;
    const canvas = canvasRef.current;
    
    if (!thumbnailVideo || !canvas || !duration) return;
    
    thumbnailVideo.currentTime = time;
  }, [duration]);

  // Handle thumbnail video seek completion
  useEffect(() => {
    const thumbnailVideo = thumbnailVideoRef.current;
    const canvas = canvasRef.current;
    
    if (!thumbnailVideo || !canvas) return;
    
    const handleSeeked = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas size (thumbnail dimensions)
      const aspectRatio = thumbnailVideo.videoWidth / thumbnailVideo.videoHeight;
      const thumbWidth = 160;
      const thumbHeight = thumbWidth / aspectRatio;
      
      canvas.width = thumbWidth;
      canvas.height = thumbHeight || 90;
      
      ctx.drawImage(thumbnailVideo, 0, 0, canvas.width, canvas.height);
      setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    thumbnailVideo.addEventListener('seeked', handleSeeked);
    return () => thumbnailVideo.removeEventListener('seeked', handleSeeked);
  }, [currentIndex]);

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * duration;
    
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(time);
    generateThumbnail(time);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
    setThumbnailUrl(null);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const buffered = videoRef.current.buffered;
      const bufferedEnd = buffered.end(buffered.length - 1);
      const videoDuration = videoRef.current.duration;
      if (videoDuration > 0) {
        setBufferedProgress((bufferedEnd / videoDuration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleVideoClick = () => {
    togglePlay();
    resetControlsTimeout();
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  if (!videos.length) return null;

  const currentVideo = videos[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black border-none"
        ref={containerRef}
        onMouseMove={handleMouseMove}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 z-50 text-white hover:bg-white/20 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Video counter */}
        {videos.length > 1 && (
          <div
            className={cn(
              "absolute top-4 left-4 z-50 text-white text-sm bg-black/50 px-3 py-1 rounded-full transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            {currentIndex + 1} / {videos.length}
          </div>
        )}

        {/* Navigation arrows */}
        {videos.length > 1 && currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}
        {videos.length > 1 && currentIndex < videos.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Video container */}
        <div
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
          onClick={handleVideoClick}
        >
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          <video
            ref={videoRef}
            src={currentVideo}
            className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onProgress={handleProgress}
            onEnded={handleVideoEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted={isMuted}
            playsInline
          />

          {/* Hidden video for thumbnail generation */}
          <video
            ref={thumbnailVideoRef}
            src={currentVideo}
            className="hidden"
            muted
            preload="metadata"
          />
          
          {/* Hidden canvas for thumbnail capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Center play button overlay */}
          {!isPlaying && !isLoading && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-10 w-10 text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar with thumbnail preview */}
          <div className="mb-3 relative">
            <div
              ref={progressBarRef}
              className="relative h-1 bg-white/30 rounded-full cursor-pointer group hover:h-1.5 transition-all"
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
              onClick={handleProgressClick}
            >
              {/* Buffered progress bar */}
              <div
                className="absolute left-0 top-0 h-full bg-white/50 rounded-full transition-all"
                style={{ width: `${bufferedProgress}%` }}
              />
              
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 h-full bg-white rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              
              {/* Seek handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
              />

              {/* Thumbnail preview on hover */}
              {hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none"
                  style={{ left: hoverPosition }}
                >
                  <div className="bg-black/90 rounded-lg overflow-hidden shadow-xl border border-white/20">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="Preview"
                        className="w-40 h-auto"
                      />
                    ) : (
                      <div className="w-40 h-[90px] bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="px-2 py-1 text-center text-white text-xs font-medium bg-black/80">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Skip backward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>

              {/* Skip forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20 h-9 w-9"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.05}
                  onValueChange={(value) => {
                    setVolume(value[0]);
                    setIsMuted(value[0] === 0);
                  }}
                  className="w-20 cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_.bg-primary]:bg-white"
                />
              </div>

              {/* Time display */}
              <span className="text-white text-sm ml-3 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback Speed */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-white hover:bg-white/20 h-9 px-2 text-sm font-medium min-w-[50px]"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </Button>
                {showSpeedMenu && (
                  <div 
                    className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-sm rounded-lg py-1 min-w-[80px] border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {playbackSpeeds.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                        }}
                        className={cn(
                          "w-full px-3 py-1.5 text-sm text-left hover:bg-white/20 transition-colors",
                          playbackSpeed === speed ? "text-primary font-medium" : "text-white"
                        )}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              {isPiPSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePiP}
                  className="text-white hover:bg-white/20 h-9 w-9"
                  title="Picture-in-Picture (P)"
                >
                  {isPiP ? (
                    <PictureInPictureIcon className="h-5 w-5" />
                  ) : (
                    <PictureInPicture2 className="h-5 w-5" />
                  )}
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 h-9 w-9"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
