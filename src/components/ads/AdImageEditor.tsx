import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, X, Loader2, ZoomIn, ZoomOut, Move, 
  RotateCw, Check, AlertCircle, ImageIcon,
  Smartphone, Monitor, Square
} from "lucide-react";
import { uploadAdMedia } from "@/hooks/useAds";
import { toast } from "sonner";

interface AdImageEditorProps {
  mediaUrl: string;
  onMediaChange: (url: string) => void;
}

// Recommended sizes for different placements
const IMAGE_SPECS = {
  feed: {
    name: "Feed",
    ratio: "1.91:1",
    width: 1200,
    height: 628,
    description: "Recommended for news feed ads",
    icon: Monitor,
  },
  square: {
    name: "Square",
    ratio: "1:1",
    width: 1080,
    height: 1080,
    description: "Works well across all placements",
    icon: Square,
  },
  story: {
    name: "Story",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    description: "Full-screen vertical for stories",
    icon: Smartphone,
  },
};

export const AdImageEditor = ({ mediaUrl, onMediaChange }: AdImageEditorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedSpec, setSelectedSpec] = useState<"feed" | "square" | "story">("feed");
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadAdMedia(file);
      onMediaChange(url);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageInfo({ width: img.width, height: img.height });
      };
      img.src = url;
      
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetTransform = () => {
    setZoom([100]);
    setPosition({ x: 0, y: 0 });
  };

  const spec = IMAGE_SPECS[selectedSpec];
  const aspectRatio = spec.width / spec.height;

  // Calculate if current image matches recommended spec
  const getImageQuality = () => {
    if (!imageInfo) return null;
    
    const { width, height } = imageInfo;
    const currentRatio = width / height;
    const targetRatio = spec.width / spec.height;
    const ratioDiff = Math.abs(currentRatio - targetRatio);
    
    // Check resolution
    const isHighRes = width >= spec.width * 0.8 && height >= spec.height * 0.8;
    const isGoodRatio = ratioDiff < 0.15;
    
    if (isHighRes && isGoodRatio) {
      return { status: "excellent", message: "Perfect for this placement!" };
    } else if (isHighRes || isGoodRatio) {
      return { status: "good", message: "Good quality, may need slight adjustment" };
    } else {
      return { status: "warning", message: "Consider uploading a higher resolution image" };
    }
  };

  const quality = getImageQuality();

  return (
    <div className="space-y-4">
      {/* Image Specs Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Recommended Image Sizes
          </CardTitle>
          <CardDescription className="text-xs">
            Choose a format that matches your ad placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(IMAGE_SPECS) as [keyof typeof IMAGE_SPECS, typeof IMAGE_SPECS.feed][]).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setSelectedSpec(key)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedSpec === key
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{s.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.width}×{s.height}px
                </div>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {s.ratio}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area or Image Editor */}
      {!mediaUrl ? (
        <Card>
          <CardContent className="p-0">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors m-4">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium text-foreground">Click to upload image</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to 10MB
                  </span>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Recommended: {spec.width}×{spec.height}px
                    </Badge>
                  </div>
                </>
              )}
            </label>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Adjust Your Image</CardTitle>
              <div className="flex items-center gap-2">
                {quality && (
                  <Badge 
                    variant={quality.status === "excellent" ? "default" : quality.status === "good" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {quality.status === "excellent" && <Check className="h-3 w-3 mr-1" />}
                    {quality.status === "warning" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {quality.message}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMediaChange("")}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {imageInfo && (
              <CardDescription className="text-xs">
                Original: {imageInfo.width}×{imageInfo.height}px
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Frame */}
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-lg border bg-muted/20 cursor-move"
              style={{ aspectRatio: aspectRatio }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={mediaUrl}
                alt="Ad image"
                className="absolute max-w-none select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom[0] / 100})`,
                  transformOrigin: "center",
                  left: "50%",
                  top: "50%",
                  marginLeft: "-50%",
                  marginTop: "-50%",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                draggable={false}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setImageInfo({ width: img.naturalWidth, height: img.naturalHeight });
                }}
              />
              
              {/* Frame overlay */}
              <div className="absolute inset-0 pointer-events-none border-2 border-primary/20 rounded-lg" />
              
              {/* Drag hint */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/50 rounded text-white text-xs flex items-center gap-1">
                <Move className="h-3 w-3" />
                Drag to reposition
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              {/* Zoom Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Zoom</Label>
                  <span className="text-xs text-muted-foreground">{zoom[0]}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={50}
                    max={200}
                    step={5}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetTransform}
                  className="flex-1"
                >
                  <RotateCw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      Replace
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-primary" />
                Image Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use high-resolution images ({spec.width}×{spec.height}px or larger)</li>
                <li>• Keep important content centered</li>
                <li>• Avoid too much text in the image</li>
                <li>• Use contrasting colors for visibility</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
