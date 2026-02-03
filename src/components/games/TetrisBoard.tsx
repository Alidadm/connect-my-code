import { memo } from "react";
import { TetrisPiece, BOARD_WIDTH, BOARD_HEIGHT } from "@/lib/tetris";

interface TetrisBoardProps {
  board: (string | null)[][];
  currentPiece: TetrisPiece | null;
  position: { x: number; y: number };
  ghostY: number;
}

const CELL_SIZE = 24;

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
                className="relative border border-border/20"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: cell || undefined,
                }}
              >
                {/* Ghost piece indicator */}
                {isGhost && (
                  <div
                    className="absolute inset-0.5 border-2 border-dashed opacity-30"
                    style={{ borderColor: ghostBoard[rowIndex][colIndex] || undefined }}
                  />
                )}
                {/* Pixel block styling */}
                {cell && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-white/20" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-black/20" />
                  </>
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
