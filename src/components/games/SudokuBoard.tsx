import { cn } from "@/lib/utils";

interface SudokuBoardProps {
  puzzle: number[][];
  currentState: number[][];
  notes: Set<number>[][];
  selectedCell: [number, number] | null;
  errors: Set<string>;
  onCellSelect: (row: number, col: number) => void;
  disabled: boolean;
}

export const SudokuBoard = ({
  puzzle,
  currentState,
  notes,
  selectedCell,
  errors,
  onCellSelect,
  disabled
}: SudokuBoardProps) => {
  const getSelectedNumber = (): number | null => {
    if (!selectedCell) return null;
    const [row, col] = selectedCell;
    return currentState[row]?.[col] || null;
  };

  const selectedNumber = getSelectedNumber();

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Decorative background */}
      <div className="absolute inset-0 -m-2 sm:-m-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      <div className="relative bg-card rounded-xl shadow-lg p-1.5 sm:p-2 md:p-3 border-2 border-primary/20">
        <div 
          className="grid gap-0"
          style={{ 
            gridTemplateColumns: 'repeat(9, 1fr)',
            aspectRatio: '1/1',
            width: '100%'
          }}
        >
          {Array.from({ length: 81 }).map((_, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            const value = currentState[row]?.[col] || 0;
            const isOriginal = puzzle[row]?.[col] !== 0;
            const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
            const isError = errors.has(`${row}-${col}`);
            const cellNotes = notes[row]?.[col] || new Set();
            
            // Highlight same number
            const isSameNumber = selectedNumber && value === selectedNumber && value !== 0;
            
            // Highlight same row/col/box
            const isRelated = selectedCell && (
              selectedCell[0] === row || 
              selectedCell[1] === col ||
              (Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) && 
               Math.floor(selectedCell[1] / 3) === Math.floor(col / 3))
            );

            // Box borders
            const isRightBoxBorder = col === 2 || col === 5;
            const isBottomBoxBorder = row === 2 || row === 5;
            const isLeftEdge = col === 0;
            const isTopEdge = row === 0;
            const isRightEdge = col === 8;
            const isBottomEdge = row === 8;

            return (
              <button
                key={`${row}-${col}`}
                onClick={() => !disabled && onCellSelect(row, col)}
                disabled={disabled || isOriginal}
                className={cn(
                  "relative flex items-center justify-center transition-all duration-150",
                  "text-sm xs:text-base sm:text-lg md:text-xl font-medium",
                  "border-border/50",
                  // Base styling
                  isOriginal ? "bg-muted/50 cursor-default" : "bg-background hover:bg-accent/50 cursor-pointer",
                  // Selection
                  isSelected && "ring-2 ring-primary ring-inset bg-primary/20",
                  // Related cells (same row/col/box)
                  !isSelected && isRelated && "bg-primary/5",
                  // Same number highlight
                  !isSelected && isSameNumber && "bg-primary/15",
                  // Error state
                  isError && "bg-destructive/20 text-destructive",
                  // Borders
                  "border",
                  isRightBoxBorder && "border-r-2 border-r-primary/40",
                  isBottomBoxBorder && "border-b-2 border-b-primary/40",
                  isLeftEdge && "border-l-2 border-l-primary/40",
                  isTopEdge && "border-t-2 border-t-primary/40",
                  isRightEdge && "border-r-2 border-r-primary/40",
                  isBottomEdge && "border-b-2 border-b-primary/40",
                  // Disabled
                  disabled && "opacity-70 pointer-events-none"
                )}
                style={{ aspectRatio: '1/1' }}
              >
                {value !== 0 ? (
                  <span className={cn(
                    isOriginal ? "text-foreground font-bold" : "text-primary font-medium",
                    isError && "text-destructive"
                  )}>
                    {value}
                  </span>
                ) : cellNotes.size > 0 ? (
                  <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <span 
                        key={n}
                        className={cn(
                          "text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] flex items-center justify-center text-muted-foreground",
                          cellNotes.has(n) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
