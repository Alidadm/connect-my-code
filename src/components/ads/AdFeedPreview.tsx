import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Megaphone, MessageCircle, Share2, ThumbsUp, 
  ExternalLink, MoreVertical, Bookmark
} from "lucide-react";

interface AdFeedPreviewProps {
  headline: string;
  primaryText: string;
  description?: string;
  mediaUrl?: string;
  callToAction: string;
  destinationUrl: string;
  placement?: "feed" | "sidebar" | "stories";
}

export const AdFeedPreview = ({
  headline,
  primaryText,
  description,
  mediaUrl,
  callToAction,
  destinationUrl,
  placement = "feed",
}: AdFeedPreviewProps) => {
  // Feed placement - full post card style
  if (placement === "feed") {
    return (
      <Card className="overflow-hidden max-w-md mx-auto">
        <CardHeader className="bg-muted/30 py-2 px-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Feed Ad Preview</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Sponsored</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Post Card Structure */}
          <div className="bg-card">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground">Your Business</span>
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
                <p className="text-sm text-foreground leading-relaxed">
                  {primaryText || "Your primary text will appear here..."}
                </p>
              </div>
            )}

            {/* Image */}
            {mediaUrl ? (
              <div className="relative bg-muted/20">
                <img
                  src={mediaUrl}
                  alt="Ad preview"
                  className="w-full max-h-[400px] object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Your ad image will appear here</p>
                  <p className="text-xs mt-1">Recommended: 1200×628px (1.91:1)</p>
                </div>
              </div>
            )}

            {/* Link Preview Card */}
            <div className="mx-3 my-2 border rounded-lg overflow-hidden bg-muted/20">
              <div className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {destinationUrl ? new URL(destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`).hostname : "yourwebsite.com"}
                </p>
                <h4 className="font-semibold text-foreground text-sm line-clamp-2">
                  {headline || "Your headline here"}
                </h4>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{description}</p>
                )}
              </div>
              <Button 
                variant="ghost" 
                className="w-full rounded-none border-t bg-muted/30 hover:bg-muted/50 text-primary font-medium text-sm h-10"
              >
                {callToAction}
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>

            {/* Engagement Bar */}
            <div className="px-3 py-2 border-t flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                  <span>Like</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
              <Bookmark className="h-4 w-4 hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sidebar placement - compact card
  if (placement === "sidebar") {
    return (
      <Card className="overflow-hidden max-w-[280px] mx-auto">
        <CardHeader className="bg-muted/30 py-2 px-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Sidebar Ad Preview</span>
          </div>
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
              <div className="aspect-square bg-muted/30 flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-3">
              <Badge variant="outline" className="text-[10px] mb-2">Sponsored</Badge>
              <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                {headline || "Your headline here"}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {primaryText || "Your text here..."}
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs h-8">
                {callToAction}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stories placement - vertical format
  return (
    <Card className="overflow-hidden max-w-[200px] mx-auto">
      <CardHeader className="bg-muted/30 py-2 px-3 border-b">
        <span className="text-xs text-muted-foreground font-medium">Stories Ad Preview</span>
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
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <Megaphone className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          {/* Story overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
          <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Megaphone className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-white text-xs font-medium">Your Business</span>
            <Badge className="ml-auto text-[8px] bg-white/20 text-white border-0">Ad</Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-2">
              {headline || "Your headline here"}
            </h4>
            <Button size="sm" className="w-full text-xs h-8">
              {callToAction}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
