import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, MessageCircle, Share2, ThumbsUp, 
  ExternalLink, MoreVertical, Bookmark, LayoutGrid, 
  PanelRight, Film
} from "lucide-react";

interface AdCreativePreviewProps {
  headline: string;
  primaryText: string;
  description?: string;
  mediaUrl?: string;
  callToAction: string;
  destinationUrl: string;
}

// Helper function to safely extract hostname from URL
const safeGetHostname = (url: string): string => {
  if (!url) return "yourwebsite.com";
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    return new URL(fullUrl).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "yourwebsite.com";
  }
};

export const AdCreativePreview = ({
  headline,
  primaryText,
  description,
  mediaUrl,
  callToAction,
  destinationUrl,
}: AdCreativePreviewProps) => {
  const [activeTab, setActiveTab] = useState("sidebar");

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sidebar" className="gap-1.5 text-xs">
            <PanelRight className="h-3.5 w-3.5" />
            Sidebar
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-1.5 text-xs">
            <Film className="h-3.5 w-3.5" />
            Stories
          </TabsTrigger>
        </TabsList>

        {/* Sidebar Preview */}
        <TabsContent value="sidebar" className="mt-3">
          <Card className="overflow-hidden max-w-[280px] mx-auto shadow-lg">
            <CardHeader className="bg-muted/30 py-1.5 px-3 border-b">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Sidebar Preview
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-card">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Ad preview"
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                    <div className="text-center">
                      <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Add an image</p>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <Badge variant="outline" className="text-[10px] mb-2">
                    Sponsored
                  </Badge>
                  <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                    {headline || "Your headline here"}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {primaryText || "Your ad text will appear here..."}
                  </p>
                  <Button size="sm" variant="default" className="w-full text-xs h-8">
                    {callToAction || "Learn More"}
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feed Preview */}
        <TabsContent value="feed" className="mt-3">
          <Card className="overflow-hidden max-w-md mx-auto shadow-lg">
            <CardHeader className="bg-muted/30 py-1.5 px-3 border-b">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Feed Preview
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-card">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                      <Megaphone className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">Your Business</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                          Sponsored
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">Just now</span>
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                {primaryText && (
                  <div className="px-3 py-2">
                    <p className="text-sm leading-relaxed">
                      {primaryText}
                    </p>
                  </div>
                )}

                {/* Image */}
                {mediaUrl ? (
                  <div className="relative bg-muted/20">
                    <img
                      src={mediaUrl}
                      alt="Ad preview"
                      className="w-full max-h-[300px] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                    <div className="text-center">
                      <Megaphone className="h-12 w-12 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Your ad image</p>
                      <p className="text-xs text-muted-foreground/70">1200×628px recommended</p>
                    </div>
                  </div>
                )}

                {/* Link Preview */}
                <div className="mx-3 my-2 border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {safeGetHostname(destinationUrl)}
                    </p>
                    <h4 className="font-semibold text-sm line-clamp-2">
                      {headline || "Your headline here"}
                    </h4>
                    {description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {description}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full rounded-none border-t bg-muted/30 text-primary font-medium text-sm h-10"
                  >
                    {callToAction || "Learn More"}
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>

                {/* Engagement Bar */}
                <div className="px-3 py-2 border-t flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-xs">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Like</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs">
                      <MessageCircle className="h-4 w-4" />
                      <span>Comment</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs">
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                  </div>
                  <Bookmark className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stories Preview */}
        <TabsContent value="stories" className="mt-3">
          <Card className="overflow-hidden max-w-[200px] mx-auto shadow-lg">
            <CardHeader className="bg-muted/30 py-1.5 px-3 border-b">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Stories Preview
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative bg-card aspect-[9/16]">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt="Ad preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <Megaphone className="h-10 w-10 text-primary/50" />
                  </div>
                )}
                {/* Story overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
                <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Megaphone className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-white text-xs font-medium">Your Business</span>
                  <Badge className="ml-auto text-[8px] bg-white/20 text-white border-0">
                    Ad
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="text-white text-sm font-semibold line-clamp-2 mb-2 drop-shadow-lg">
                    {headline || "Your headline here"}
                  </h4>
                  <Button size="sm" className="w-full text-xs h-8">
                    {callToAction || "Learn More"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
