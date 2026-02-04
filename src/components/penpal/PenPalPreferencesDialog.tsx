import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Settings2 } from "lucide-react";
import { type PenPalPreferences } from "@/hooks/usePenPals";

const AVAILABLE_INTERESTS = [
  "Music", "Movies", "Reading", "Sports", "Travel", "Gaming",
  "Cooking", "Photography", "Art", "Technology", "Nature", "Fashion",
  "Dancing", "Writing", "Volunteering", "Languages", "Pets", "Fitness"
];

interface PenPalPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: PenPalPreferences | null;
  onSave: (prefs: Partial<PenPalPreferences>) => Promise<boolean>;
}

export const PenPalPreferencesDialog = ({
  open,
  onOpenChange,
  preferences,
  onSave,
}: PenPalPreferencesDialogProps) => {
  const { t } = useTranslation();
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setIsDiscoverable(preferences.is_discoverable);
      setSelectedInterests(preferences.interests || []);
      setLookingFor(preferences.looking_for_description || "");
    }
  }, [preferences]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave({
      is_discoverable: isDiscoverable,
      interests: selectedInterests,
      looking_for_description: lookingFor,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("penpal.preferencesTitle", "PenPal Preferences")}
          </DialogTitle>
          <DialogDescription>
            {t("penpal.preferencesDesc", "Customize your PenPal profile to help others find you")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Discoverable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("penpal.discoverable", "Discoverable")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("penpal.discoverableDesc", "Allow others to find you in PenPal discovery")}
              </p>
            </div>
            <Switch
              checked={isDiscoverable}
              onCheckedChange={setIsDiscoverable}
            />
          </div>

          {/* Looking For Description */}
          <div className="space-y-2">
            <Label>{t("penpal.lookingFor", "What are you looking for?")}</Label>
            <Textarea
              placeholder={t("penpal.lookingForPlaceholder", "Tell potential pen pals what kind of connections you're seeking...")}
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {lookingFor.length}/500
            </p>
          </div>

          {/* Interests Selection */}
          <div className="space-y-3">
            <Label>{t("penpal.interests", "Your Interests")}</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <Badge
                    key={interest}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                    {isSelected && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("penpal.interestsHint", "Select interests to help match with like-minded people")}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
