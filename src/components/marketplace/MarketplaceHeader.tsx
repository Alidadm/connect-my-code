import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserLocation } from "@/hooks/useMarketplace";

interface MarketplaceHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  userLocation: UserLocation | null;
}

export const MarketplaceHeader = ({
  searchValue,
  onSearchChange,
  onToggleFilters,
  showFilters,
  userLocation,
}: MarketplaceHeaderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        {userLocation && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {userLocation.city || "Your area"}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Marketplace"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
