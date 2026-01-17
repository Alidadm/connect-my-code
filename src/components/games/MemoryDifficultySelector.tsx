import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Zap } from "lucide-react";

export type MemoryDifficulty = "easy" | "medium" | "hard";

interface MemoryDifficultySelectorProps {
  value: MemoryDifficulty;
  onChange: (difficulty: MemoryDifficulty) => void;
}

export const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, cols: 3, label: "Easy", icon: Sparkles },
  medium: { pairs: 8, cols: 4, label: "Medium", icon: Brain },
  hard: { pairs: 12, cols: 4, label: "Hard", icon: Zap },
} as const;

export const MemoryDifficultySelector = ({ value, onChange }: MemoryDifficultySelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {t("games.selectDifficulty", { defaultValue: "Select Difficulty" })}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(DIFFICULTY_CONFIG) as MemoryDifficulty[]).map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          const Icon = config.icon;
          const isSelected = value === difficulty;

          return (
            <Button
              key={difficulty}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="flex flex-col h-auto py-3 gap-1"
              onClick={() => onChange(difficulty)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t(`games.difficulty.${difficulty}`, { defaultValue: config.label })}
              </span>
              <span className="text-xs opacity-70">
                {config.pairs} {t("games.pairs", { defaultValue: "pairs" })}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
