import { Button } from "@/components/ui/button";
import { MarketplaceCategory } from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";

interface MarketplaceCategoryBarProps {
  categories: MarketplaceCategory[];
  selectedCategory: string | undefined;
  onSelectCategory: (categoryId: string | null) => void;
}

export const MarketplaceCategoryBar = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: MarketplaceCategoryBarProps) => {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div className="flex gap-2 pb-2 min-w-max">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectCategory(null)}
          className="shrink-0"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "shrink-0 gap-1.5",
              selectedCategory === category.id && "bg-primary text-primary-foreground"
            )}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
