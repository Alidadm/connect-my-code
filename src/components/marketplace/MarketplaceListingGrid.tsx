import { MarketplaceListing } from "@/hooks/useMarketplace";
import { MarketplaceListingCard } from "./MarketplaceListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

interface MarketplaceListingGridProps {
  listings: MarketplaceListing[];
  isLoading: boolean;
  savedListingIds: Set<string>;
  onToggleSave: (listingId: string) => void;
}

export const MarketplaceListingGrid = ({
  listings,
  isLoading,
  savedListingIds,
  onToggleSave,
}: MarketplaceListingGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No listings found</h3>
        <p className="text-muted-foreground mt-1">
          Try adjusting your filters or be the first to list something!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <MarketplaceListingCard
          key={listing.id}
          listing={listing}
          isSaved={savedListingIds.has(listing.id)}
          onToggleSave={() => onToggleSave(listing.id)}
        />
      ))}
    </div>
  );
};
