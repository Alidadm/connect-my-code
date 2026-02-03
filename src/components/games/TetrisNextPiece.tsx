import { memo } from "react";
import { TetrisPiece } from "@/lib/tetris";
import { useTranslation } from "react-i18next";

interface TetrisNextPieceProps {
  piece: TetrisPiece;
}

const CELL_SIZE = 20;

export const TetrisNextPiece = memo(({ piece }: TetrisNextPieceProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-card border-2 border-border rounded-lg p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
        {t("games.tetris.next", { defaultValue: "Next" })}
      </p>
      <div
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${piece.shape[0].length}, ${CELL_SIZE}px)`,
          width: piece.shape[0].length * CELL_SIZE + (piece.shape[0].length - 1) * 2,
        }}
      >
        {piece.shape.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="relative"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell ? piece.color : "transparent",
                border: cell ? "none" : "1px solid hsl(var(--border) / 0.3)",
              }}
            >
              {cell === 1 && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/30" />
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-white/20" />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30" />
                  <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-black/20" />
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

TetrisNextPiece.displayName = "TetrisNextPiece";
