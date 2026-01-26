import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MarketplaceFilters as FiltersType } from "@/hooks/useMarketplace";

interface MarketplaceFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const MarketplaceFilters = ({
  filters,
  onFiltersChange,
}: MarketplaceFiltersProps) => {
  const handleConditionChange = (condition: string, checked: boolean) => {
    const current = filters.condition || [];
    const updated = checked
      ? [...current, condition]
      : current.filter((c) => c !== condition);
    onFiltersChange({ ...filters, condition: updated.length > 0 ? updated : undefined });
  };

  return (
    <Card>
      <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full"
            />
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label>Condition</Label>
          <div className="space-y-1.5">
            {CONDITIONS.map((condition) => (
              <div key={condition.value} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${condition.value}`}
                  checked={filters.condition?.includes(condition.value) || false}
                  onCheckedChange={(checked) =>
                    handleConditionChange(condition.value, checked as boolean)
                  }
                />
                <label
                  htmlFor={`condition-${condition.value}`}
                  className="text-sm cursor-pointer"
                >
                  {condition.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Type */}
        <div className="space-y-2">
          <Label>Delivery</Label>
          <Select
            value={filters.deliveryType || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                deliveryType: value === "all" ? undefined : (value as "pickup" | "shipping"),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pickup">Local Pickup</SelectItem>
              <SelectItem value="shipping">Shipping Available</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select
            value={filters.sortBy || "newest"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                sortBy: value as FiltersType["sortBy"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Newest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
