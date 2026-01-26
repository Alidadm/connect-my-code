import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
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
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
