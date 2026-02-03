import { memo } from "react";
import { TetrisPiece, BOARD_WIDTH, BOARD_HEIGHT } from "@/lib/tetris";

interface TetrisBoardProps {
  board: (string | null)[][];
  currentPiece: TetrisPiece | null;
  position: { x: number; y: number };
}

const CELL_SIZE = 28;

// Helper function to adjust HSL color brightness
const adjustColor = (hslColor: string, amount: number): string => {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslColor;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const TetrisBoard = memo(({ board, currentPiece, position }: TetrisBoardProps) => {
  // Merge current piece onto display board
  const displayBoard = board.map((row) => [...row]);

  if (currentPiece) {
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
      className="relative p-1 rounded-lg shadow-xl"
      style={{
        background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(200, 90%, 50%), hsl(160, 80%, 45%), hsl(280, 80%, 50%))",
        backgroundSize: "300% 300%",
        animation: "borderGlow 4s ease infinite",
      }}
    >
      <div
        className="relative bg-background/95 rounded-md"
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
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                {/* Empty cell grid */}
                {!cell && (
                  <div className="absolute inset-0 border border-border/10" />
                )}
                {/* 3D Block styling - flat with border */}
                {cell && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: cell,
                      borderTop: `2px solid ${adjustColor(cell, 30)}`,
                      borderLeft: `2px solid ${adjustColor(cell, 30)}`,
                      borderBottom: `2px solid ${adjustColor(cell, -40)}`,
                      borderRight: `2px solid ${adjustColor(cell, -40)}`,
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

TetrisBoard.displayName = "TetrisBoard";
