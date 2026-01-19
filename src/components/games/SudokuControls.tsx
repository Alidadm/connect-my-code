import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eraser, Lightbulb, CheckCircle, RotateCcw, PenTool, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SudokuControlsProps {
  onNumberInput: (num: number) => void;
  onClear: () => void;
  onHint: () => void;
  onValidate: () => void;
  onReset: () => void;
  onSave?: () => void;
  isNoteMode: boolean;
  onToggleNoteMode: () => void;
  disabled: boolean;
  isSaving?: boolean;
  showSave?: boolean;
}

export const SudokuControls = ({
  onNumberInput,
  onClear,
  onHint,
  onValidate,
  onReset,
  onSave,
  isNoteMode,
  onToggleNoteMode,
  disabled,
  isSaving = false,
  showSave = false
}: SudokuControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full lg:w-auto">
      {/* Number pad - horizontal on mobile, grid on desktop */}
      <div className="bg-card rounded-xl shadow-lg p-2 sm:p-3 border border-border">
        <div className="grid grid-cols-9 sm:grid-cols-3 gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <Button
              key={num}
              variant="outline"
              size="sm"
              onClick={() => onNumberInput(num)}
              disabled={disabled}
              className={cn(
                "h-10 sm:h-12 sm:w-12 text-lg sm:text-xl font-bold p-0",
                isNoteMode && "bg-secondary/50"
              )}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {/* Action buttons - horizontal scroll on mobile */}
      <div className="bg-card rounded-xl shadow-lg p-2 sm:p-3 border border-border">
        <div className="grid grid-cols-4 sm:grid-cols-2 gap-1 sm:gap-2">
          <Button
            variant={isNoteMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleNoteMode}
            disabled={disabled}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <PenTool className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t("games.notes", { defaultValue: "Notes" })}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={disabled}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <Eraser className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t("games.erase", { defaultValue: "Erase" })}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onHint}
            disabled={disabled}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t("games.hint", { defaultValue: "Hint" })}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={disabled}
            className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
          >
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{t("games.check", { defaultValue: "Check" })}</span>
          </Button>
        </div>
        
        {showSave && onSave && (
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={disabled || isSaving}
            className="w-full mt-2 gap-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t("games.saveProgress", { defaultValue: "Save Progress" })}
          </Button>
        )}
        
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
