import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eraser, Lightbulb, CheckCircle, RotateCcw, PenTool } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SudokuControlsProps {
  onNumberInput: (num: number) => void;
  onClear: () => void;
  onHint: () => void;
  onValidate: () => void;
  onReset: () => void;
  isNoteMode: boolean;
  onToggleNoteMode: () => void;
  disabled: boolean;
}

export const SudokuControls = ({
  onNumberInput,
  onClear,
  onHint,
  onValidate,
  onReset,
  isNoteMode,
  onToggleNoteMode,
  disabled
}: SudokuControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 w-full lg:w-auto">
      {/* Number pad */}
      <div className="bg-card rounded-xl shadow-lg p-3 border border-border">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              onClick={() => onNumberInput(num)}
              disabled={disabled}
              className={cn(
                "w-12 h-12 text-xl font-bold",
                isNoteMode && "bg-secondary/50"
              )}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-card rounded-xl shadow-lg p-3 border border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={isNoteMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleNoteMode}
            disabled={disabled}
            className="gap-1"
          >
            <PenTool className="w-4 h-4" />
            {t("games.notes", { defaultValue: "Notes" })}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={disabled}
            className="gap-1"
          >
            <Eraser className="w-4 h-4" />
            {t("games.erase", { defaultValue: "Erase" })}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onHint}
            disabled={disabled}
            className="gap-1"
          >
            <Lightbulb className="w-4 h-4" />
            {t("games.hint", { defaultValue: "Hint" })}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={disabled}
            className="gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {t("games.check", { defaultValue: "Check" })}
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="w-full mt-2 gap-1 text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          {t("games.restart", { defaultValue: "Restart" })}
        </Button>
      </div>
    </div>
  );
};
