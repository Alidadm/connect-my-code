import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface CreateCustomCategoryDialogProps {
  onCreateCategory: (name: string, keywords: string, icon?: string, color?: string) => Promise<unknown>;
  disabled?: boolean;
  maxReached?: boolean;
}

const EMOJI_OPTIONS = ["📰", "🌍", "💼", "🎮", "🎬", "🏀", "🔬", "💰", "🎵", "📱", "✈️", "🍔"];
const COLOR_OPTIONS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"];

export const CreateCustomCategoryDialog: React.FC<CreateCustomCategoryDialogProps> = ({
  onCreateCategory,
  disabled,
  maxReached,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📰");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keywords.trim()) return;

    setIsSubmitting(true);
    const result = await onCreateCategory(name, keywords, selectedIcon, selectedColor);
    setIsSubmitting(false);

    if (result) {
      setName("");
      setKeywords("");
      setSelectedIcon("📰");
      setSelectedColor("#6366f1");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || maxReached}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {t("news.createCustomCategory", "Create Custom")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("news.createCustomCategoryTitle", "Create Custom Category")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("news.categoryName", "Category Name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder={t("news.categoryNamePlaceholder", "e.g., Electric Vehicles")}
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">{t("news.keywords", "Keywords")}</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value.slice(0, 100))}
              placeholder={t("news.keywordsPlaceholder", "e.g., Tesla electric cars EV")}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("news.keywordsHint", "Enter keywords to search for news articles")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("news.icon", "Icon")}</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedIcon === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("news.color", "Color")}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !keywords.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("common.creating", "Creating...")}
                </>
              ) : (
                t("common.create", "Create")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
