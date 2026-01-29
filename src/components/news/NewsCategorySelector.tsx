import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import * as LucideIcons from "lucide-react";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
}

interface NewsCategorySelectorProps {
  categories: NewsCategory[];
  selectedCategories: string[];
  onToggle: (categoryId: string) => void;
  maxCategories: number;
  trigger?: React.ReactNode;
}

export const NewsCategorySelector: React.FC<NewsCategorySelectorProps> = ({
  categories,
  selectedCategories,
  onToggle,
  maxCategories,
  trigger,
}) => {
  const { t } = useTranslation();

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {t("news.selectCategories", "Select Categories")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("news.selectNewsCategories", "Select News Categories")}</DialogTitle>
          <DialogDescription>
            {t("news.selectUpTo", "Select up to {{max}} categories to follow", {
              max: maxCategories,
            })}
            <span className="block mt-1 font-medium text-foreground">
              {t("news.selectedCount", "{{count}} of {{max}} selected", {
                count: selectedCategories.length,
                max: maxCategories,
              })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            const isDisabled = !isSelected && selectedCategories.length >= maxCategories;

            return (
              <button
                key={category.id}
                onClick={() => onToggle(category.id)}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: category.color || "#6b7280" }}
                >
                  {getIcon(category.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm block truncate">
                    {category.name}
                  </span>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {selectedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {t("news.yourCategories", "Your categories:")}
            </p>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => selectedCategories.includes(c.id))
                .map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    style={{ backgroundColor: category.color || undefined }}
                    className="text-white cursor-pointer hover:opacity-80"
                    onClick={() => onToggle(category.id)}
                  >
                    {category.name}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
