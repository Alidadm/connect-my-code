import { cn } from "@/lib/utils";

interface TicTacToeBoardProps {
  board: string[];
  onCellClick: (index: number) => void;
  disabled: boolean;
  winningCells?: number[];
}

export const TicTacToeBoard = ({ board, onCellClick, disabled, winningCells = [] }: TicTacToeBoardProps) => {
  return (
    <div className="relative p-6 rounded-2xl mx-auto max-w-[340px]">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/40 dark:from-primary/30 dark:via-accent/20 dark:to-secondary/30" />
      <div 
        className="absolute inset-0 rounded-2xl opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Decorative corners */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />
      
      {/* Game grid */}
      <div className="relative grid grid-cols-3 gap-3 w-full max-w-[300px] aspect-square">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => onCellClick(index)}
            disabled={disabled || cell !== ''}
            className={cn(
              "aspect-square rounded-xl border-2 text-4xl font-bold transition-all duration-300",
              "bg-background/80 backdrop-blur-sm border-border/50 shadow-lg",
              "hover:bg-accent/80 hover:border-primary hover:scale-105 hover:shadow-xl",
              "disabled:hover:bg-background/80 disabled:hover:scale-100 disabled:cursor-not-allowed",
              "flex items-center justify-center",
              cell === 'x' && "text-primary drop-shadow-[0_2px_4px_rgba(var(--primary),0.3)]",
              cell === 'o' && "text-destructive drop-shadow-[0_2px_4px_rgba(var(--destructive),0.3)]",
              winningCells.includes(index) && "bg-primary/30 border-primary animate-pulse"
            )}
          >
            {cell === 'x' && <span className="animate-in zoom-in-50 duration-200">✕</span>}
            {cell === 'o' && <span className="animate-in zoom-in-50 duration-200">○</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
