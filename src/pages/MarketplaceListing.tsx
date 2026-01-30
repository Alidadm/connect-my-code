import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplaceListing, useMarketplace } from "@/hooks/useMarketplace";
import { MarketplaceLayout } from "@/components/marketplace/MarketplaceLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  MapPin,
  Truck,
  Package,
  Share2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Clock,
  Eye,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ContactSellerDialog } from "@/components/marketplace/ContactSellerDialog";
import { EditListingDialog } from "@/components/marketplace/EditListingDialog";
import { formatDistanceToNow } from "date-fns";

const formatPrice = (price: number, currency: string) => {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  like_new: { label: "Like New", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  good: { label: "Good", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  fair: { label: "Fair", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  poor: { label: "Poor", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

const MarketplaceListing = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { listing, isLoading, refetch } = useMarketplaceListing(id);
  const { toggleSaveListing, savedListingIds, trackView, categories } = useMarketplace();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isSaved = id ? savedListingIds.has(id) : false;
  const isOwner = user?.id === listing?.user_id;

  useEffect(() => {
    if (id && user) {
      trackView(id);
    }
  }, [id, user, trackView]);

  const handleEditSuccess = () => {
    refetch?.();
  };

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
      <MarketplaceLayout onCreateListing={() => {}}>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="aspect-[4/3] rounded-2xl" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="w-20 h-20 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!listing) {
    return (
      <MarketplaceLayout onCreateListing={() => {}}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-muted/50 rounded-full p-6 mb-4">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Listing not found</h2>
          <p className="text-muted-foreground mt-1 mb-6">
            This listing may have been removed or sold.
          </p>
          <Button onClick={() => navigate("/marketplace")}>
            Browse Marketplace
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  const images = listing.images.length > 0 ? listing.images : ["/placeholder.svg"];
  const conditionInfo = CONDITION_LABELS[listing.condition] || CONDITION_LABELS.good;

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
    <MarketplaceLayout onCreateListing={() => {}}>
      <ScrollArea className="h-[calc(100vh-2rem)]">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/marketplace")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Image gallery - takes 3 columns */}
            <div className="lg:col-span-3 space-y-3">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted group">
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            index === currentImageIndex
                              ? "bg-white scale-110"
                              : "bg-white/50 hover:bg-white/70"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all",
                        index === currentImageIndex
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/30"
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

              {/* Description section - visible on desktop */}
              <div className="hidden lg:block">
                {listing.description && (
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        Description
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {listing.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Details panel - takes 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              {/* Price and title */}
              <div className="space-y-2">
                <p className="text-4xl font-bold tracking-tight">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                <h1 className="text-xl font-medium text-foreground/90">{listing.title}</h1>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                </span>
                {listing.views_count !== undefined && listing.views_count > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {listing.views_count} views
                    </span>
                  </>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn("border", conditionInfo.color)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {conditionInfo.label}
                </Badge>
                {listing.category && (
                  <Badge variant="secondary" className="gap-1">
                    {listing.category.icon} {listing.category.name}
                  </Badge>
                )}
              </div>

              {/* Delivery options */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Delivery Options
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {listing.allow_pickup && (
                      <div className="flex items-center gap-2 text-sm bg-background rounded-lg p-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Local Pickup</span>
                      </div>
                    )}
                    {listing.allow_shipping && (
                      <div className="flex items-center gap-2 text-sm bg-background rounded-lg p-3">
                        <Truck className="h-4 w-4 text-primary" />
                        <div>
                          <span>Shipping</span>
                          {listing.shipping_price !== null && (
                            <span className="text-muted-foreground ml-1">
                              ({formatPrice(listing.shipping_price, listing.currency)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {listing.location_city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {listing.location_city}
                      {listing.location_region && `, ${listing.location_region}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Seller info */}
              <Card className="border-0 shadow-none bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-background">
                      <AvatarImage src={listing.seller?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {listing.seller?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {listing.seller?.display_name || "Unknown Seller"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <span>Verified Member</span>
                      </div>
                    </div>
                    {listing.seller?.username && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/${listing.seller!.username}`)}
                      >
                        View Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description on mobile */}
              <div className="lg:hidden">
                {listing.description && (
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {listing.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-background pt-4 pb-2 space-y-3">
                {!isOwner && (
                  <>
                    <Button
                      className="w-full h-12 text-base gap-2"
                      onClick={() => setShowContactDialog(true)}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Message Seller
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-11"
                        onClick={() => id && toggleSaveListing(id)}
                      >
                        <Heart
                          className={cn(
                            "h-4 w-4 mr-2",
                            isSaved && "fill-destructive text-destructive"
                          )}
                        />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                      <Button variant="outline" className="flex-1 h-11">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </>
                )}

                {isOwner && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Listing
                    </Button>
                    <Button variant="destructive" className="flex-1 h-12">
                      Mark as Sold
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Contact seller dialog */}
      <ContactSellerDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        listing={listing}
        onMessageSent={() => navigate("/marketplace?tab=inbox")}
      />

      {/* Edit listing dialog */}
      {listing && (
        <EditListingDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          listing={listing}
          categories={categories}
          onSuccess={handleEditSuccess}
        />
      )}
    </MarketplaceLayout>
  );
};

export default MarketplaceListing;
