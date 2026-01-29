import React from "react";
import { Newspaper, Settings2, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NewsFlipbook } from "./NewsFlipbook";
import { NewsCategorySelector } from "./NewsCategorySelector";
import { CreateCustomCategoryDialog } from "./CreateCustomCategoryDialog";
import { useNews } from "@/hooks/useNews";
import { useCustomNewsCategories } from "@/hooks/useCustomNewsCategories";
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

  const {
    customCategories,
    customNewsByCategory,
    loading: loadingCustom,
    loadingNews: loadingCustomNews,
    createCustomCategory,
    deleteCustomCategory,
    refreshCategoryNews,
    maxCustomCategories,
  } = useCustomNewsCategories();

  if (!user) {
    return null;
  }

  if (loading || loadingCustom) {
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

  const hasAnyNews =
    Object.keys(newsByCategory).length > 0 ||
    Object.keys(customNewsByCategory).length > 0;
  const hasAnyCategories = userCategories.length > 0 || customCategories.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            {t("news.myNews", "My News")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <CreateCustomCategoryDialog
              onCreateCategory={createCustomCategory}
              maxReached={customCategories.length >= maxCustomCategories}
            />
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyCategories ? (
          <div className="text-center py-6">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {t("news.noCategories", "Select categories to see news")}
            </p>
            <div className="flex flex-col gap-2 items-center">
              <NewsCategorySelector
                categories={categories}
                selectedCategories={userCategories}
                onToggle={toggleCategory}
                maxCategories={maxCategories}
              />
              <span className="text-xs text-muted-foreground">{t("common.or", "or")}</span>
              <CreateCustomCategoryDialog
                onCreateCategory={createCustomCategory}
                maxReached={customCategories.length >= maxCustomCategories}
              />
            </div>
          </div>
        ) : loadingNews || loadingCustomNews ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !hasAnyNews ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              {t("news.noNewsYet", "No news available yet. Check back soon!")}
            </p>
          </div>
        ) : (
          <>
            {/* Standard categories */}
            {selectedCategoryData.map((category) => {
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
            })}

            {/* Custom categories */}
            {customCategories.map((category) => {
              const items = customNewsByCategory[category.id];
              
              return (
                <div key={category.id} className="relative">
                  {/* Custom category header with actions */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: category.color }}
                        className="text-white font-medium"
                      >
                        <span className="mr-1">{category.icon}</span>
                        {category.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({category.keywords})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => refreshCategoryNews(category.id)}
                        title={t("news.refresh", "Refresh")}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => deleteCustomCategory(category.id)}
                        title={t("news.delete", "Delete")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {items && items.length > 0 ? (
                    <NewsFlipbook
                      items={items.map((item) => ({
                        ...item,
                        category_id: item.custom_category_id,
                      }))}
                    />
                  ) : (
                    <div className="text-center py-4 bg-muted/50 rounded-xl">
                      <p className="text-xs text-muted-foreground">
                        {t("news.fetchingNews", "Fetching news...")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
};
