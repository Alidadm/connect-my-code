import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useMarketplaceMessages } from "@/hooks/useMarketplaceMessages";
import { MarketplaceLayout } from "@/components/marketplace/MarketplaceLayout";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceCategoryBar } from "@/components/marketplace/MarketplaceCategoryBar";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { MarketplaceListingGrid } from "@/components/marketplace/MarketplaceListingGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { MarketplaceInbox } from "@/components/marketplace/MarketplaceInbox";
import { Navigate } from "react-router-dom";

const Marketplace = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "browse";
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    categories,
    listings,
    isLoading,
    filters,
    setFilters,
    userLocation,
    toggleSaveListing,
    savedListingIds,
    refetch,
  } = useMarketplace();

  const { unreadCount } = useMarketplaceMessages();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case "inbox":
        return (
          <div className="p-4 lg:p-6">
            <MarketplaceInbox />
          </div>
        );
      default:
        return (
          <div className="p-4 lg:p-6 space-y-4">
            {/* Header with search */}
            <MarketplaceHeader
              searchValue={filters.search || ""}
              onSearchChange={(search) => setFilters({ ...filters, search })}
              onToggleFilters={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
              userLocation={userLocation}
            />

            {/* Category bar */}
            <MarketplaceCategoryBar
              categories={categories}
              selectedCategory={filters.category}
              onSelectCategory={(category) =>
                setFilters({ ...filters, category: category || undefined })
              }
            />

            {/* Filters panel */}
            {showFilters && (
              <MarketplaceFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {/* Listings grid */}
            <MarketplaceListingGrid
              listings={listings}
              isLoading={isLoading}
              savedListingIds={savedListingIds}
              onToggleSave={toggleSaveListing}
            />
          </div>
        );
    }
  };

  return (
    <MarketplaceLayout 
      onCreateListing={() => setShowCreateDialog(true)}
      unreadMessages={unreadCount}
    >
      {renderContent()}

      {/* Create listing dialog */}
      <CreateListingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        categories={categories}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
    </MarketplaceLayout>
  );
};

export default Marketplace;
