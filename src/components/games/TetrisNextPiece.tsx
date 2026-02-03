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
                  className="absolute inset-0.5 rounded-sm"
                  style={{
                    background: `linear-gradient(135deg, 
                      ${adjustColor(piece.color, 40)} 0%, 
                      ${piece.color} 30%, 
                      ${piece.color} 70%, 
                      ${adjustColor(piece.color, -40)} 100%)`,
                    boxShadow: `
                      inset 1px 1px 3px ${adjustColor(piece.color, 60)},
                      inset -1px -1px 3px ${adjustColor(piece.color, -60)},
                      1px 1px 3px rgba(0,0,0,0.3)
                    `,
                  }}
                >
                  {/* Top highlight */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-[2px] rounded-t-sm"
                    style={{ background: `linear-gradient(180deg, ${adjustColor(piece.color, 80)}, transparent)` }}
                  />
                  {/* Left highlight */}
                  <div 
                    className="absolute top-0 left-0 bottom-0 w-[2px] rounded-l-sm"
                    style={{ background: `linear-gradient(90deg, ${adjustColor(piece.color, 60)}, transparent)` }}
                  />
                  {/* Center shine */}
                  <div 
                    className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full opacity-60"
                    style={{ background: `radial-gradient(circle, ${adjustColor(piece.color, 90)}, transparent)` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

TetrisNextPiece.displayName = "TetrisNextPiece";
