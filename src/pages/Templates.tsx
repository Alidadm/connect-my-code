import { MainLayout } from "@/components/layout/MainLayout";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Check, Palette, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Base color families - order: light, base, dark
const colorFamilies: Record<string, { slugs: [string, string, string]; gradients: [string, string, string] }> = {
  blue: {
    slugs: ["blue-light", "blue", "blue-dark"],
    gradients: [
      "from-blue-300 to-purple-300",
      "from-blue-500 to-purple-500",
      "from-blue-700 to-purple-700",
    ],
  },
  orange: {
    slugs: ["orange-light", "orange", "orange-dark"],
    gradients: [
      "from-orange-300 to-amber-300",
      "from-orange-500 to-amber-500",
      "from-orange-700 to-amber-700",
    ],
  },
  red: {
    slugs: ["red-light", "red", "red-dark"],
    gradients: [
      "from-red-300 to-rose-300",
      "from-red-500 to-rose-500",
      "from-red-700 to-rose-700",
    ],
  },
  green: {
    slugs: ["green-light", "green", "green-dark"],
    gradients: [
      "from-green-300 to-emerald-300",
      "from-green-500 to-emerald-500",
      "from-green-700 to-emerald-700",
    ],
  },
  teal: {
    slugs: ["teal-light", "teal", "teal-dark"],
    gradients: [
      "from-teal-300 to-blue-300",
      "from-teal-500 to-blue-500",
      "from-teal-700 to-blue-700",
    ],
  },
  purple: {
    slugs: ["purple-light", "purple", "purple-dark"],
    gradients: [
      "from-purple-300 to-pink-300",
      "from-purple-500 to-pink-500",
      "from-purple-700 to-pink-700",
    ],
  },
  yellow: {
    slugs: ["yellow-light", "yellow", "yellow-dark"],
    gradients: [
      "from-yellow-200 to-amber-200",
      "from-yellow-500 to-amber-500",
      "from-yellow-600 to-amber-600",
    ],
  },
};

// "All Colors" card swatches map to base themes
const allColorsSwatchSlugs = ["blue", "purple", "teal", "orange", "red", "yellow"] as const;

const Templates = () => {
  const { user, loading: authLoading } = useAuth();
  const { themes, selectedTheme, loading, selectTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleSelectTheme = async (themeId: string) => {
    await selectTheme(themeId);
    toast.success("Theme applied successfully!");
  };

  const applyThemeBySlug = async (slug: string) => {
    const theme = themes.find((t) => t.slug === slug);
    if (!theme) return;
    await handleSelectTheme(theme.id);
  };

  // Filter themes to show only base + all-colors (hide -light and -dark from main grid)
  const displayThemes = useMemo(() => {
    const baseThemeSlugs = new Set([
      "all-colors",
      "blue",
      "orange",
      "red",
      "green",
      "teal",
      "purple",
      "yellow",
    ]);
    return themes.filter((t) => baseThemeSlugs.has(t.slug));
  }, [themes]);

  // Check if selected theme is in a color family
  const getSelectedFamilyInfo = (familyKey: string) => {
    const family = colorFamilies[familyKey];
    if (!family || !selectedTheme) return { isInFamily: false, selectedIndex: -1 };
    const idx = family.slugs.indexOf(selectedTheme.slug);
    return { isInFamily: idx !== -1, selectedIndex: idx };
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  // Get preview colors for each theme
  const getThemePreview = (slug: string) => {
    switch (slug) {
      case "all-colors":
        return {
          colors: [
            "from-blue-500 to-purple-500",
            "from-purple-500 to-pink-500",
            "from-teal-500 to-blue-500",
            "from-orange-500 to-amber-500",
            "from-rose-500 to-red-500",
            "from-yellow-500 to-orange-500",
          ],
          icon: Sparkles,
        };
      default: {
        const family = colorFamilies[slug];
        if (family) {
          return {
            colors: family.gradients,
            icon: Palette,
          };
        }
        return {
          colors: [
            "from-blue-500 to-purple-500",
            "from-blue-400 to-violet-500",
            "from-sky-500 to-purple-500",
          ],
          icon: Palette,
        };
      }
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Choose Your Template</h1>
          <p className="text-muted-foreground">
            Personalize your experience by selecting a color theme that matches your style.
            Click any shade circle to apply light, normal, or dark variations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {displayThemes.map((theme) => {
            const isAllColors = theme.slug === "all-colors";
            const family = colorFamilies[theme.slug];
            const { isInFamily, selectedIndex } = getSelectedFamilyInfo(theme.slug);
            const isSelected = selectedTheme?.id === theme.id || isInFamily;
            const preview = getThemePreview(theme.slug);
            const IconComponent = preview.icon;

            return (
              <Card
                key={theme.id}
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg",
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => handleSelectTheme(theme.id)}
              >
                {/* Preview Header */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                  {/* Color circles preview */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 p-4">
                    {preview.colors.map((gradient, index) => {
                      // Determine which slug this swatch should apply
                      let targetSlug: string | undefined;
                      if (isAllColors) {
                        targetSlug = allColorsSwatchSlugs[index];
                      } else if (family) {
                        targetSlug = family.slugs[index];
                      }

                      const isSwatchSelected = isInFamily && selectedIndex === index;

                      return (
                        <button
                          key={index}
                          type="button"
                          className={cn(
                            "w-10 h-10 rounded-full bg-gradient-to-br shadow-lg transform transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            gradient,
                            isSwatchSelected && "ring-2 ring-white ring-offset-2 ring-offset-slate-200 dark:ring-offset-slate-800 scale-110"
                          )}
                          style={{ animationDelay: `${index * 100}ms` }}
                          title={
                            isAllColors
                              ? `Apply ${targetSlug} theme`
                              : index === 0
                              ? "Light"
                              : index === 1
                              ? "Normal"
                              : "Dark"
                          }
                          aria-label={
                            isAllColors
                              ? `Apply ${targetSlug} theme`
                              : `Apply ${index === 0 ? "light" : index === 1 ? "normal" : "dark"} ${theme.name} theme`
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (targetSlug) {
                              void applyThemeBySlug(targetSlug);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    </div>
                  )}

                  {/* Default badge */}
                  {theme.is_default && !isSelected && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary">Default</Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className={cn(
                          "w-5 h-5",
                          isAllColors ? "text-purple-500" : "text-primary"
                        )} />
                        <h3 className="font-semibold text-foreground">{theme.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                      {!isAllColors && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Click circles: Light · Normal · Dark
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full mt-4",
                      isSelected && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    variant={isSelected ? "outline" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleSelectTheme(theme.id);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Currently Active
                      </>
                    ) : (
                      "Apply This Theme"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Templates;