import { memo } from "react";
import { TetrisPiece, BOARD_WIDTH, BOARD_HEIGHT } from "@/lib/tetris";

interface TetrisBoardProps {
  board: (string | null)[][];
  currentPiece: TetrisPiece | null;
  position: { x: number; y: number };
  ghostY: number;
}

const CELL_SIZE = 24;

// Helper function to adjust HSL color brightness
const adjustColor = (hslColor: string, amount: number): string => {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslColor;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const TetrisBoard = memo(({ board, currentPiece, position, ghostY }: TetrisBoardProps) => {
  // Merge current piece and ghost piece onto display board
  const displayBoard = board.map((row) => [...row]);
  const ghostBoard = board.map((row) => row.map(() => null as string | null));

  if (currentPiece) {
    // Draw ghost piece
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const boardRow = ghostY + row;
          const boardCol = position.x + col;
          if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
            ghostBoard[boardRow][boardCol] = currentPiece.color;
          }
        }
      }
    }

    // Draw current piece
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const boardRow = position.y + row;
          const boardCol = position.x + col;
          if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
            displayBoard[boardRow][boardCol] = currentPiece.color;
          }
        }
      }
    }
  }

  return (
    <div
      className="relative border-4 border-border bg-background/80 shadow-lg"
      style={{
        width: BOARD_WIDTH * CELL_SIZE + 8,
        height: BOARD_HEIGHT * CELL_SIZE + 8,
        imageRendering: "pixelated",
      }}
    >
      {/* Grid lines for retro effect */}
      <div className="absolute inset-1 grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${CELL_SIZE}px)`,
        }}
      >
        {displayBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isGhost = !cell && ghostBoard[rowIndex][colIndex];
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                {/* Empty cell grid */}
                {!cell && !isGhost && (
                  <div className="absolute inset-0 border border-border/10" />
                )}
                {/* Ghost piece indicator */}
                {isGhost && (
                  <div
                    className="absolute inset-1 rounded-sm border-2 border-dashed opacity-40"
                    style={{ borderColor: ghostBoard[rowIndex][colIndex] || undefined }}
                  />
                )}
                {/* 3D Block styling */}
                {cell && (
                  <div
                    className="absolute inset-0.5 rounded-sm"
                    style={{
                      background: `linear-gradient(135deg, 
                        ${adjustColor(cell, 40)} 0%, 
                        ${cell} 30%, 
                        ${cell} 70%, 
                        ${adjustColor(cell, -40)} 100%)`,
                      boxShadow: `
                        inset 2px 2px 4px ${adjustColor(cell, 60)},
                        inset -2px -2px 4px ${adjustColor(cell, -60)},
                        2px 2px 4px rgba(0,0,0,0.3)
                      `,
                    }}
                  >
                    {/* Top highlight */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-sm"
                      style={{ background: `linear-gradient(180deg, ${adjustColor(cell, 80)}, transparent)` }}
                    />
                    {/* Left highlight */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-sm"
                      style={{ background: `linear-gradient(90deg, ${adjustColor(cell, 60)}, transparent)` }}
                    />
                    {/* Bottom shadow */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-sm"
                      style={{ background: `linear-gradient(0deg, ${adjustColor(cell, -70)}, transparent)` }}
                    />
                    {/* Right shadow */}
                    <div 
                      className="absolute top-0 right-0 bottom-0 w-[3px] rounded-r-sm"
                      style={{ background: `linear-gradient(270deg, ${adjustColor(cell, -50)}, transparent)` }}
                    />
                    {/* Center shine */}
                    <div 
                      className="absolute top-1 left-1 w-2 h-2 rounded-full opacity-60"
                      style={{ background: `radial-gradient(circle, ${adjustColor(cell, 90)}, transparent)` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

TetrisBoard.displayName = "TetrisBoard";
