import { MainLayout } from "@/components/layout/MainLayout";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Check, Palette, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      case "orange":
        return {
          colors: [
            "from-orange-500 to-orange-600",
            "from-amber-500 to-orange-500",
            "from-orange-400 to-amber-500",
          ],
          icon: Palette,
        };
      case "red":
        return {
          colors: [
            "from-red-500 to-red-600",
            "from-rose-500 to-red-500",
            "from-red-400 to-rose-500",
          ],
          icon: Palette,
        };
      case "green":
        return {
          colors: [
            "from-green-500 to-green-600",
            "from-emerald-500 to-green-500",
            "from-green-400 to-emerald-500",
          ],
          icon: Palette,
        };
      case "teal":
        return {
          colors: [
            "from-teal-500 to-blue-500",
            "from-cyan-500 to-blue-600",
            "from-teal-400 to-sky-500",
          ],
          icon: Palette,
        };
      case "purple":
        return {
          colors: [
            "from-purple-500 to-pink-500",
            "from-violet-500 to-pink-500",
            "from-purple-400 to-rose-400",
          ],
          icon: Palette,
        };
      case "yellow":
        return {
          colors: [
            "from-yellow-500 to-amber-500",
            "from-amber-400 to-yellow-500",
            "from-yellow-400 to-orange-400",
          ],
          icon: Palette,
        };
      default:
        return {
          colors: [
            "from-blue-500 to-purple-500",
            "from-blue-400 to-violet-500",
            "from-sky-500 to-purple-500",
          ],
          icon: Palette,
        };
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Choose Your Template</h1>
          <p className="text-muted-foreground">
            Personalize your experience by selecting a color theme that matches your style.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {themes.map((theme) => {
            const isSelected = selectedTheme?.id === theme.id;
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
                  <div className="absolute inset-0 flex items-center justify-center gap-2 p-4">
                    {preview.colors.map((gradient, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-8 h-8 rounded-full bg-gradient-to-br shadow-lg transform transition-transform hover:scale-110",
                          gradient
                        )}
                        style={{
                          animationDelay: `${index * 100}ms`,
                        }}
                      />
                    ))}
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
                          theme.slug === "all-colors" ? "text-purple-500" : "text-blue-500"
                        )} />
                        <h3 className="font-semibold text-foreground">{theme.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
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
                      handleSelectTheme(theme.id);
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
