import { Link } from "react-router-dom";
import { Heart, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceListing } from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";

interface MarketplaceListingCardProps {
  listing: MarketplaceListing;
  isSaved: boolean;
  onToggleSave: () => void;
}

const formatPrice = (price: number, currency: string) => {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export const MarketplaceListingCard = ({
  listing,
  isSaved,
  onToggleSave,
}: MarketplaceListingCardProps) => {
  const imageUrl = listing.images?.[0] || "/placeholder.svg";

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/marketplace/${listing.id}`}>
        <div className="relative aspect-square">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {listing.price === 0 && (
            <Badge className="absolute top-2 left-2 bg-primary hover:bg-primary/90">
              Free
            </Badge>
          )}
          {listing.allow_shipping && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 left-2 gap-1"
            >
              <Truck className="h-3 w-3" />
              Ships
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg leading-tight">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <Link to={`/marketplace/${listing.id}`}>
              <h3 className="text-sm font-medium truncate hover:underline">
                {listing.title}
              </h3>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isSaved ? "fill-destructive text-destructive" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {listing.location_city && (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {listing.location_city}
            </span>
          )}
          <span>•</span>
          <span>{CONDITION_LABELS[listing.condition]}</span>
        </div>
      </CardContent>
    </Card>
  );
};
