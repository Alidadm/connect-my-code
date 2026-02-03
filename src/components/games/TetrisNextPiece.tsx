import { memo } from "react";
import { TetrisPiece } from "@/lib/tetris";
import { useTranslation } from "react-i18next";

interface TetrisNextPieceProps {
  piece: TetrisPiece;
}

const CELL_SIZE = 20;

// Helper function to adjust HSL color brightness
const adjustColor = (hslColor: string, amount: number): string => {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslColor;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const TetrisNextPiece = memo(({ piece }: TetrisNextPieceProps) => {
  const { t } = useTranslation();
  
  return (
    <div
      className="p-[1px] rounded-lg"
      style={{
        background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(200, 90%, 50%), hsl(160, 80%, 45%), hsl(280, 80%, 50%))",
        backgroundSize: "300% 300%",
        animation: "borderGlow 4s ease infinite",
      }}
    >
      <div className="bg-card rounded-lg p-3">
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
              }}
            >
              {!cell && (
                <div 
                  className="absolute inset-0" 
                  style={{ border: "1px solid hsl(var(--border) / 0.2)" }} 
                />
              )}
              {cell === 1 && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: piece.color,
                    borderTop: `2px solid ${adjustColor(piece.color, 30)}`,
                    borderLeft: `2px solid ${adjustColor(piece.color, 30)}`,
                    borderBottom: `2px solid ${adjustColor(piece.color, -40)}`,
                    borderRight: `2px solid ${adjustColor(piece.color, -40)}`,
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
});

TetrisNextPiece.displayName = "TetrisNextPiece";
