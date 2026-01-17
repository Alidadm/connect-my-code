import { cn } from "@/lib/utils";

interface TicTacToeBoardProps {
  board: string[];
  onCellClick: (index: number) => void;
  disabled: boolean;
  winningCells?: number[];
}

export const TicTacToeBoard = ({ board, onCellClick, disabled, winningCells = [] }: TicTacToeBoardProps) => {
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] aspect-square mx-auto">
      {board.map((cell, index) => (
        <button
          key={index}
          onClick={() => onCellClick(index)}
          disabled={disabled || cell !== ''}
          className={cn(
            "aspect-square rounded-lg border-2 border-border bg-card text-4xl font-bold transition-all duration-200",
            "hover:bg-accent hover:border-primary disabled:hover:bg-card disabled:cursor-not-allowed",
            "flex items-center justify-center",
            cell === 'x' && "text-primary",
            cell === 'o' && "text-destructive",
            winningCells.includes(index) && "bg-primary/20 border-primary"
          )}
        >
          {cell === 'x' && '✕'}
          {cell === 'o' && '○'}
        </button>
      ))}
    </div>
  );
};
