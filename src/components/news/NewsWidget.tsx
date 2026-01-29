import React from "react";
import { Newspaper, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsFlipbook } from "./NewsFlipbook";
import { NewsCategorySelector } from "./NewsCategorySelector";
import { useNews } from "@/hooks/useNews";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export const NewsWidget: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    categories,
    userCategories,
    newsByCategory,
    loading,
    loadingNews,
    toggleCategory,
    maxCategories,
  } = useNews();

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const selectedCategoryData = categories.filter((c) =>
    userCategories.includes(c.id)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            {t("news.myNews", "My News")}
          </CardTitle>
          <NewsCategorySelector
            categories={categories}
            selectedCategories={userCategories}
            onToggle={toggleCategory}
            maxCategories={maxCategories}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {userCategories.length === 0 ? (
          <div className="text-center py-6">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {t("news.noCategories", "Select categories to see news")}
            </p>
            <NewsCategorySelector
              categories={categories}
              selectedCategories={userCategories}
              onToggle={toggleCategory}
              maxCategories={maxCategories}
            />
          </div>
        ) : loadingNews ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : Object.keys(newsByCategory).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              {t("news.noNewsYet", "No news available yet. Check back soon!")}
            </p>
          </div>
        ) : (
          selectedCategoryData.map((category) => {
            const items = newsByCategory[category.id];
            if (!items || items.length === 0) return null;

            return (
              <NewsFlipbook
                key={category.id}
                items={items}
                categoryName={category.name}
                categoryColor={category.color || undefined}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
