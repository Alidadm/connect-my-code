import React, { useState, useMemo } from "react";
import { Newspaper, Settings2, RefreshCw, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NewsFlipbook } from "./NewsFlipbook";
import { NewsCategorySelector } from "./NewsCategorySelector";
import { CreateCustomCategoryDialog } from "./CreateCustomCategoryDialog";
import { useNews } from "@/hooks/useNews";
import { useCustomNewsCategories } from "@/hooks/useCustomNewsCategories";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

const NEWS_WIDGET_HIDDEN_KEY = "newsWidgetHidden";

export const NewsWidget: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem(NEWS_WIDGET_HIDDEN_KEY) === "true";
  });

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

  const handleHideWidget = () => {
    localStorage.setItem(NEWS_WIDGET_HIDDEN_KEY, "true");
    setIsHidden(true);
  };

  // Combine all selected categories for tabs
  const allTabs = useMemo(() => {
    const standardTabs = categories
      .filter((c) => userCategories.includes(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: "standard" as const,
      }));

    const customTabs = customCategories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: "custom" as const,
    }));

    return [...standardTabs, ...customTabs];
  }, [categories, userCategories, customCategories]);

  const [activeTab, setActiveTab] = useState<string>("");

  // Set default active tab when tabs change
  React.useEffect(() => {
    if (allTabs.length > 0 && (!activeTab || !allTabs.find((t) => t.id === activeTab))) {
      setActiveTab(allTabs[0].id);
    }
  }, [allTabs, activeTab]);

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-3.5 w-3.5" /> : null;
  };

  if (!user || isHidden) {
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

  const hasAnyCategories = userCategories.length > 0 || customCategories.length > 0;

  // Find the active tab data
  const activeTabData = allTabs.find((t) => t.id === activeTab);
  const activeCustomCategory = customCategories.find((c) => c.id === activeTab);

  return (
    <Card>
      <CardHeader className="pb-2 space-y-0">
        {/* Header row with title and actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Newspaper className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">
              {t("news.myNews", "My News")}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="h-4 w-4" />
                </Button>
              }
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleHideWidget}
              title={t("news.hideWidget", "Hide news widget")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
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
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Category tabs */}
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-3">
              {allTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "h-7 px-2 py-1 text-xs rounded-full border transition-all data-[state=active]:shadow-sm",
                    "data-[state=inactive]:bg-muted/50 data-[state=inactive]:border-transparent",
                    "data-[state=active]:border-primary/30"
                  )}
                  style={{
                    backgroundColor: activeTab === tab.id ? `${tab.color}20` : undefined,
                    borderColor: activeTab === tab.id ? tab.color || undefined : undefined,
                  }}
                >
                  <span
                    className="flex items-center gap-1"
                    style={{ color: activeTab === tab.id ? tab.color || undefined : undefined }}
                  >
                    {tab.type === "custom" ? (
                      <span className="text-xs">{tab.icon}</span>
                    ) : (
                      getIcon(tab.icon)
                    )}
                    <span className="truncate max-w-[60px]">{tab.name}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab content */}
            {loadingNews || loadingCustomNews ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
              allTabs.map((tab) => {
                const isCustom = tab.type === "custom";
                const items = isCustom
                  ? customNewsByCategory[tab.id]
                  : newsByCategory[tab.id];

                return (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    {/* Custom category actions */}
                    {isCustom && activeCustomCategory && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {activeCustomCategory.keywords}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => refreshCategoryNews(tab.id)}
                            title={t("news.refresh", "Refresh")}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteCustomCategory(tab.id)}
                            title={t("news.delete", "Delete")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {items && items.length > 0 ? (
                      <NewsFlipbook
                        items={
                          isCustom
                            ? items.map((item: any) => ({
                                ...item,
                                category_id: item.custom_category_id,
                              }))
                            : items
                        }
                        categoryName={isCustom ? undefined : tab.name}
                        categoryColor={isCustom ? undefined : tab.color || undefined}
                      />
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-xl">
                        <p className="text-xs text-muted-foreground">
                          {t("news.fetchingNews", "Fetching news...")}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                );
              })
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};