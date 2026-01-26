import { useParams, Link, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplaceListing, useMarketplace } from "@/hooks/useMarketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  Truck,
  Package,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ContactSellerDialog } from "@/components/marketplace/ContactSellerDialog";

const formatPrice = (price: number, currency: string) => {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const MarketplaceListing = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { listing, isLoading } = useMarketplaceListing(id);
  const { toggleSaveListing, savedListingIds, trackView } = useMarketplace();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactDialog, setShowContactDialog] = useState(false);

  const isSaved = id ? savedListingIds.has(id) : false;
  const isOwner = user?.id === listing?.user_id;

  useEffect(() => {
    if (id && user) {
      trackView(id);
    }
  }, [id, user, trackView]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="aspect-square md:aspect-video rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
        </div>
      </MainLayout>
    );
  }

  if (!listing) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Listing not found</h2>
          <p className="text-muted-foreground mt-1">
            This listing may have been removed or sold.
          </p>
          <Link to="/marketplace">
            <Button className="mt-4">Browse Marketplace</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const images = listing.images.length > 0 ? listing.images : ["/placeholder.svg"];

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Back button */}
        <Link to="/marketplace">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image gallery */}
          <div className="space-y-2">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={images[currentImageIndex]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-80 hover:opacity-100"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-80 hover:opacity-100"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "aspect-square rounded-md overflow-hidden border-2 transition-colors",
                      index === currentImageIndex
                        ? "border-primary"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={img}
                      alt={`${listing.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">
                {formatPrice(listing.price, listing.currency)}
              </p>
              <h1 className="text-xl font-semibold mt-1">{listing.title}</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {CONDITION_LABELS[listing.condition]}
              </Badge>
              {listing.category && (
                <Badge variant="outline">
                  {listing.category.icon} {listing.category.name}
                </Badge>
              )}
              {listing.allow_pickup && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  Pickup
                </Badge>
              )}
              {listing.allow_shipping && (
                <Badge variant="outline" className="gap-1">
                  <Truck className="h-3 w-3" />
                  Ships
                  {listing.shipping_price !== null && (
                    <span>
                      ({formatPrice(listing.shipping_price, listing.currency)})
                    </span>
                  )}
                </Badge>
              )}
            </div>

            {listing.location_city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {listing.location_city}
                {listing.location_region && `, ${listing.location_region}`}
              </div>
            )}

            {listing.description && (
              <div>
                <h3 className="font-medium mb-1">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Seller info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={listing.seller?.avatar_url || ""} />
                    <AvatarFallback>
                      {listing.seller?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {listing.seller?.display_name || "Unknown Seller"}
                    </p>
                    {listing.seller?.username && (
                      <Link
                        to={`/${listing.seller.username}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View Profile
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {!isOwner && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => setShowContactDialog(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Seller
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => id && toggleSaveListing(id)}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isSaved && "fill-destructive text-destructive"
                    )}
                  />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Edit Listing
                </Button>
                <Button variant="destructive" className="flex-1">
                  Mark as Sold
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Contact seller dialog */}
        <ContactSellerDialog
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          listing={listing}
        />
      </div>
    </MainLayout>
  );
};

export default MarketplaceListing;
