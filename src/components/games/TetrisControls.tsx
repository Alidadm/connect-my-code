import { memo } from "react";
import { Button } from "@/components/ui/button";
import { 
  RotateCw, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  ChevronsDown,
  Pause,
  Play 
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface TetrisControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  disabled: boolean;
}

export const TetrisControls = memo(({
  onMoveLeft,
  onMoveRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  onTogglePause,
  isPaused,
  disabled,
}: TetrisControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {/* Pause Button */}
      <div
        className="p-[1px] rounded-lg"
        style={{
          background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(200, 90%, 50%), hsl(160, 80%, 45%), hsl(280, 80%, 50%))",
          backgroundSize: "300% 300%",
          animation: "borderGlow 4s ease infinite",
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePause}
          disabled={disabled}
          className="w-full border-0 bg-card hover:bg-accent"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 mr-2 text-green-500" />
              {t("games.tetris.resume", { defaultValue: "Resume" })}
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mr-2 text-amber-500" />
              {t("games.tetris.pause", { defaultValue: "Pause" })}
            </>
          )}
        </Button>
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <Button
          variant="secondary"
          size="lg"
          onClick={onMoveLeft}
          disabled={disabled || isPaused}
          className="aspect-square"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onRotate}
          disabled={disabled || isPaused}
          className="aspect-square"
        >
          <RotateCw className="w-6 h-6" />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onMoveRight}
          disabled={disabled || isPaused}
          className="aspect-square"
        >
          <ArrowRight className="w-6 h-6" />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onSoftDrop}
          disabled={disabled || isPaused}
          className="aspect-square"
        >
          <ArrowDown className="w-6 h-6" />
        </Button>
        <Button
          variant="default"
          size="lg"
          onClick={onHardDrop}
          disabled={disabled || isPaused}
          className="aspect-square col-span-2"
        >
          <ChevronsDown className="w-6 h-6 mr-1" />
          {t("games.tetris.drop", { defaultValue: "Drop" })}
        </Button>
      </div>

      {/* Keyboard Hints (Desktop) */}
      <div className="hidden md:block text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
        <p className="font-medium mb-2">{t("games.tetris.controls", { defaultValue: "Controls" })}</p>
        <p>← → {t("games.tetris.move", { defaultValue: "Move" })}</p>
        <p>↑ {t("games.tetris.rotate", { defaultValue: "Rotate" })}</p>
        <p>↓ {t("games.tetris.softDrop", { defaultValue: "Soft Drop" })}</p>
        <p>Space {t("games.tetris.hardDrop", { defaultValue: "Hard Drop" })}</p>
        <p>P {t("games.tetris.pauseKey", { defaultValue: "Pause" })}</p>
      </div>
    </div>
  );
});

TetrisControls.displayName = "TetrisControls";
