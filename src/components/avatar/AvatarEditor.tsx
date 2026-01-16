import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, RotateCcw, ZoomIn, ZoomOut, Check, Loader2, Shuffle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarSaved: (url: string) => void;
  userId?: string;
  currentAvatar?: string;
  userName?: string;
}

type Mode = "select" | "camera" | "crop" | "generate";

// DiceBear avatar styles
const AVATAR_STYLES = [
  { id: "initials", name: "Initials" },
  { id: "avataaars", name: "Cartoon" },
  { id: "bottts", name: "Robot" },
  { id: "lorelei", name: "Artistic" },
  { id: "notionists", name: "Sketch" },
  { id: "personas", name: "Person" },
  { id: "thumbs", name: "Thumbs" },
  { id: "fun-emoji", name: "Emoji" },
] as const;

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  open,
  onOpenChange,
  onAvatarSaved,
  userId,
  currentAvatar,
  userName = "User",
}) => {
  const [mode, setMode] = useState<Mode>("select");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedStyle, setSelectedStyle] = useState<string>("initials");
  const [generatedSeed, setGeneratedSeed] = useState<string>(() => Math.random().toString(36).substring(7));
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Generate DiceBear avatar URL
  const getDiceBearUrl = useCallback((style: string, seed: string) => {
    const baseUrl = "https://api.dicebear.com/7.x";
    const seedValue = style === "initials" ? userName : seed;
    return `${baseUrl}/${style}/svg?seed=${encodeURIComponent(seedValue)}&size=400&radius=50`;
  }, [userName]);

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
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setCameraStream(stream);
      setMode("camera");
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImageSrc(imageDataUrl);
    
    // Stop camera
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
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
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
    if (!imageSrc || !userId) return;
    
    setUploading(true);
    
    try {
      // Create a new canvas for the cropped image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Set output size (circular avatar)
      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;
      
      // Create circular clip
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Load the image
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });
      
      // Calculate dimensions based on crop area (280px preview)
      const cropSize = 280;
      const scale = outputSize / cropSize;
      
      // Calculate the source dimensions
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // Calculate the displayed size (fit within crop area with zoom)
      const aspectRatio = naturalWidth / naturalHeight;
      let displayWidth, displayHeight;
      
      if (aspectRatio > 1) {
        displayHeight = cropSize * zoom;
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayWidth = cropSize * zoom;
        displayHeight = displayWidth / aspectRatio;
      }
      
      // Calculate draw position
      const drawX = (outputSize - displayWidth * scale) / 2 + position.x * scale;
      const drawY = (outputSize - displayHeight * scale) / 2 + position.y * scale;
      
      // Draw the image
      ctx.drawImage(img, drawX, drawY, displayWidth * scale, displayHeight * scale);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/jpeg", 0.9);
      });
      
      // Upload to Supabase storage
      const fileName = `${userId}/avatar-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", userId);
      
      if (updateError) throw updateError;
      
      toast.success("Avatar updated successfully!");
      onAvatarSaved(urlData.publicUrl);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  // Save generated avatar
  const saveGeneratedAvatar = async () => {
    if (!userId) return;
    
    setUploading(true);
    
    try {
      // Fetch the SVG from DiceBear
      const avatarUrl = getDiceBearUrl(selectedStyle, generatedSeed);
      const response = await fetch(avatarUrl);
      const svgText = await response.text();
      
      // Convert SVG to PNG using canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      canvas.width = 400;
      canvas.height = 400;
      
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 400, 400);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = reject;
        img.src = svgUrl;
      });
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });
      
      // Upload to Supabase storage
      const fileName = `${userId}/avatar-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", userId);
      
      if (updateError) throw updateError;
      
      toast.success("Avatar updated successfully!");
      onAvatarSaved(urlData.publicUrl);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to save avatar");
    } finally {
      setUploading(false);
    }
  };

  const renderSelectMode = () => (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-dashed border-muted-foreground/30">
          {currentAvatar ? (
            <img src={currentAvatar} alt="Current avatar" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-12 h-12 text-muted-foreground/50" />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={startCamera}
        >
          <Camera className="w-7 h-7" />
          <span className="text-xs">Take Photo</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-7 h-7" />
          <span className="text-xs">Upload</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => setMode("generate")}
        >
          <User className="w-7 h-7" />
          <span className="text-xs">Generate</span>
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      
      <p className="text-center text-sm text-muted-foreground">
        Choose a photo, take a new one, or generate an avatar.
      </p>
    </div>
  );

  const renderCameraMode = () => (
    <div className="space-y-4">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
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
        
        {/* Circular guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-56 rounded-full border-4 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
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
        className="relative w-full aspect-square rounded-lg overflow-hidden bg-black cursor-move select-none touch-none"
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
        
        {/* Circular crop guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[280px] h-[280px] rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
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
          Cancel
        </Button>
        
        <Button
          variant="outline"
          onClick={resetCrop}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
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
          Save
        </Button>
      </div>
    </div>
  );

  const renderGenerateMode = () => (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <div className="w-40 h-40 rounded-full bg-muted overflow-hidden border-4 border-primary/20">
          <img
            src={getDiceBearUrl(selectedStyle, generatedSeed)}
            alt="Generated avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Style selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Style</label>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_STYLES.map((style) => (
            <Button
              key={style.id}
              variant={selectedStyle === style.id ? "default" : "outline"}
              size="sm"
              className="text-xs h-9"
              onClick={() => setSelectedStyle(style.id)}
            >
              {style.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Randomize button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setGeneratedSeed(Math.random().toString(36).substring(7))}
      >
        <Shuffle className="w-4 h-4 mr-2" />
        Randomize
      </Button>
      
      {/* Action buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setMode("select")}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        
        <Button
          onClick={saveGeneratedAvatar}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "select" && "Update Avatar"}
            {mode === "camera" && "Take Photo"}
            {mode === "crop" && "Adjust & Crop"}
            {mode === "generate" && "Generate Avatar"}
          </DialogTitle>
        </DialogHeader>
        
        {mode === "select" && renderSelectMode()}
        {mode === "camera" && renderCameraMode()}
        {mode === "crop" && renderCropMode()}
        {mode === "generate" && renderGenerateMode()}
      </DialogContent>
    </Dialog>
  );
};
