import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplace } from "@/hooks/useMarketplace";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceCategoryBar } from "@/components/marketplace/MarketplaceCategoryBar";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { MarketplaceListingGrid } from "@/components/marketplace/MarketplaceListingGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Navigate } from "react-router-dom";

const Marketplace = () => {
  const { user, loading } = useAuth();
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-4">
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

        {/* Floating create button */}
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>

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
      </div>
    </MainLayout>
  );
};

export default Marketplace;
