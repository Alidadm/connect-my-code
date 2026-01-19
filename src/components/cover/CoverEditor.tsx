import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, RotateCcw, ZoomIn, ZoomOut, Check, Loader2, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CoverEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverSaved: (url: string) => void;
  userId?: string;
  currentCover?: string;
}

type Mode = "select" | "camera" | "crop";

export const CoverEditor: React.FC<CoverEditorProps> = ({
  open,
  onOpenChange,
  onCoverSaved,
  userId,
  currentCover,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("select");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Cleanup camera on unmount or mode change
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMode("select");
      setImageSrc(null);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  }, [open, cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      setMode("camera");
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error(t("cover.cameraError"));
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImageSrc(imageDataUrl);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    setMode("crop");
  };

  const switchCamera = async () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: newFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera switch error:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error(t("cover.invalidImage"));
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("cover.imageTooLarge"));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setMode("crop");
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== "crop") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode !== "crop") return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode !== "crop" || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || mode !== "crop" || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetCrop = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const cropAndUpload = async () => {
    if (!imageSrc) {
      toast.error(t("cover.noImageSelected"));
      return;
    }
    if (!userId) {
      toast.error(t("cover.uploadFailed"));
      console.error("Cannot save cover: userId is undefined");
      return;
    }
    
    setUploading(true);
    
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Cover photo dimensions (16:9 aspect ratio, 1200x400 for standard cover)
      const outputWidth = 1200;
      const outputHeight = 400;
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });
      
      // Calculate dimensions based on crop area
      const cropWidth = 400; // preview width
      const cropHeight = 133; // preview height (3:1 ratio)
      const scaleX = outputWidth / cropWidth;
      const scaleY = outputHeight / cropHeight;
      
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      const aspectRatio = naturalWidth / naturalHeight;
      let displayWidth, displayHeight;
      
      if (aspectRatio > 3) {
        displayHeight = cropHeight * zoom;
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayWidth = cropWidth * zoom;
        displayHeight = displayWidth / aspectRatio;
      }
      
      const drawX = (outputWidth - displayWidth * scaleX) / 2 + position.x * scaleX;
      const drawY = (outputHeight - displayHeight * scaleY) / 2 + position.y * scaleY;
      
      ctx.drawImage(img, drawX, drawY, displayWidth * scaleX, displayHeight * scaleY);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/jpeg", 0.9);
      });
      
      const fileName = `${userId}/cover-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: urlData.publicUrl })
        .eq("user_id", userId);
      
      if (updateError) throw updateError;
      
      toast.success(t("cover.coverUpdated"));
      onCoverSaved(urlData.publicUrl);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("cover.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const removeCover = async () => {
    if (!userId) {
      toast.error(t("cover.removeFailed"));
      console.error("Cannot remove cover: userId is undefined");
      return;
    }
    
    setUploading(true);
    
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: null })
        .eq("user_id", userId);
      
      if (updateError) throw updateError;
      
      toast.success(t("cover.coverRemoved"));
      onCoverSaved("");
      onOpenChange(false);
    } catch (error) {
      console.error("Remove cover error:", error);
      toast.error(t("cover.removeFailed"));
    } finally {
      setUploading(false);
    }
  };

  const renderSelectMode = () => (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-4 border-dashed border-muted-foreground/30">
          {currentCover ? (
            <img src={currentCover} alt="Current cover" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={startCamera}
        >
          <Camera className="w-7 h-7" />
          <span className="text-xs">{t("cover.takePhoto")}</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-7 h-7" />
          <span className="text-xs">{t("cover.upload")}</span>
        </Button>
      </div>
      
      {currentCover && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={removeCover}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          {t("cover.removeCover")}
        </Button>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      
      <p className="text-center text-sm text-muted-foreground">
        {t("cover.chooseMethod")}
      </p>
    </div>
  );

  const renderCameraMode = () => (
    <div className="space-y-4">
      <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            facingMode === "user" && "scale-x-[-1]"
          )}
        />
        
        {/* Rectangular guide overlay for cover photo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[90%] h-[80%] border-4 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
      
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
              setCameraStream(null);
            }
            setMode("select");
          }}
        >
          <X className="w-5 h-5" />
        </Button>
        
        <Button
          size="lg"
          className="w-16 h-16 rounded-full"
          onClick={capturePhoto}
        >
          <Camera className="w-8 h-8" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={switchCamera}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderCropMode = () => (
    <div className="space-y-4">
      <div 
        ref={cropAreaRef}
        className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-black cursor-move select-none touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imageSrc && (
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Preview"
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              maxWidth: "none",
              maxHeight: "none",
              width: "100%",
              height: "auto",
              objectFit: "contain",
            }}
            draggable={false}
          />
        )}
        
        {/* Rectangular crop guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[133px] border-4 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
        </div>
      </div>
      
      {/* Zoom controls */}
      <div className="flex items-center gap-4 px-4">
        <ZoomOut className="w-5 h-5 text-muted-foreground" />
        <Slider
          value={[zoom]}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={([value]) => setZoom(value)}
          className="flex-1"
        />
        <ZoomIn className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setImageSrc(null);
            setMode("select");
            resetCrop();
          }}
        >
          <X className="w-4 h-4 mr-2" />
          {t("cover.cancel")}
        </Button>
        
        <Button
          variant="outline"
          onClick={resetCrop}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {t("cover.reset")}
        </Button>
        
        <Button
          onClick={cropAndUpload}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {t("cover.save")}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && t("cover.updateCover")}
            {mode === "camera" && t("cover.takePhoto")}
            {mode === "crop" && t("cover.adjustCrop")}
          </DialogTitle>
        </DialogHeader>
        
        {mode === "select" && renderSelectMode()}
        {mode === "camera" && renderCameraMode()}
        {mode === "crop" && renderCropMode()}
      </DialogContent>
    </Dialog>
  );
};
