import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Crop, X, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BusinessCardUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  currentCardUrl?: string | null;
}

export const BusinessCardUploader = ({
  open,
  onOpenChange,
  onUpload,
  currentCardUrl,
}: BusinessCardUploaderProps) => {
  const [mode, setMode] = useState<"select" | "camera" | "preview">("select");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const handleClose = () => {
    stopCamera();
    setMode("select");
    setSelectedImage(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode("camera");
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
      console.error("Camera error:", error);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `business-card-${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        setSelectedImage(canvas.toDataURL("image/jpeg"));
        stopCamera();
        setMode("preview");
      }
    }, "image/jpeg", 0.9);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await onUpload(selectedFile);
      handleClose();
    } catch (error) {
      toast.error("Failed to upload business card");
    } finally {
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setMode("select");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Business Card</DialogTitle>
        </DialogHeader>

        {mode === "select" && (
          <div className="space-y-4">
            {currentCardUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={currentCardUrl}
                  alt="Current business card"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Current Card</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={startCamera}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span>Take Photo</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-primary" />
                <span>Upload Image</span>
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <p className="text-xs text-muted-foreground text-center">
              Take a clear photo of your business card or upload an existing image.
              The image will be auto-cropped for best display.
            </p>
          </div>
        )}

        {mode === "camera" && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[1.75/1]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Guide overlay */}
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                Position card within frame
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        )}

        {mode === "preview" && selectedImage && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={selectedImage}
                alt="Business card preview"
                className="w-full h-auto"
              />
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Use This"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
