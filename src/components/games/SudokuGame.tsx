import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useGameSounds } from "@/hooks/useGameSounds";
import { SudokuBoard } from "./SudokuBoard";
import { SudokuControls } from "./SudokuControls";
import { ArrowLeft, Clock, Lightbulb, Trophy, RotateCcw, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Json } from "@/integrations/supabase/types";

interface Player {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SudokuGameProps {
  gameId?: string | null;
  initialPuzzle?: number[][] | null;
  initialSolution?: number[][] | null;
  difficulty?: string;
  onBack: () => void;
}

type SudokuGrid = number[][];
type NotesGrid = Set<number>[][];

export const SudokuGame = ({ gameId, initialPuzzle, initialSolution, difficulty = 'medium', onBack }: SudokuGameProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { playMatch, playWin, playLose, playFlip } = useGameSounds();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<any>(null);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  
  const [puzzle, setPuzzle] = useState<SudokuGrid>([]);
  const [solution, setSolution] = useState<SudokuGrid>([]);
  const [currentState, setCurrentState] = useState<SudokuGrid>([]);
  const [notes, setNotes] = useState<NotesGrid>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize notes grid
  const initializeNotes = (): NotesGrid => {
    return Array(9).fill(null).map(() => 
      Array(9).fill(null).map(() => new Set<number>())
    );
  };

  // Convert JSON to grid
  const jsonToGrid = (json: Json): SudokuGrid => {
    if (Array.isArray(json)) {
      return json.map(row => 
        Array.isArray(row) ? row.map(cell => typeof cell === 'number' ? cell : 0) : []
      );
    }
    return Array(9).fill(null).map(() => Array(9).fill(0));
  };

  // For single-player mode without database
  const isSinglePlayer = !gameId && initialPuzzle && initialSolution;

  const fetchGame = useCallback(async () => {
    // If single player mode, use initial puzzle
    if (isSinglePlayer) {
      setPuzzle(initialPuzzle);
      setSolution(initialSolution);
      setCurrentState(initialPuzzle.map(row => [...row]));
      setNotes(initializeNotes());
      setIsRunning(true);
      setLoading(false);
      return;
    }

    if (!gameId) {
      setLoading(false);
      return;
    }

    try {
      const { data: gameData, error } = await supabase
        .from("sudoku_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) throw error;
      if (!gameData) return;

      setGame(gameData);
      
      const puzzleGrid = jsonToGrid(gameData.puzzle);
      const solutionGrid = jsonToGrid(gameData.solution);
      
      setPuzzle(puzzleGrid);
      setSolution(solutionGrid);
      
      // Determine which player state to use
      const isPlayer1 = gameData.player_1 === user?.id;
      const stateJson = isPlayer1 ? gameData.player_1_state : gameData.player_2_state;
      const playerState = stateJson ? jsonToGrid(stateJson) : puzzleGrid.map(row => [...row]);
      
      setCurrentState(playerState);
      setNotes(initializeNotes());
      setHintsUsed(isPlayer1 ? (gameData.player_1_hints_used || 0) : (gameData.player_2_hints_used || 0));
      
      // Load timer from existing time
      const existingTime = isPlayer1 ? gameData.player_1_time : gameData.player_2_time;
      if (existingTime && gameData.status === 'completed') {
        setTimer(existingTime);
        setIsRunning(false);
      } else if (gameData.status === 'active') {
        setIsRunning(true);
      }

      // Fetch player profiles
      const playerIds = [gameData.player_1];
      if (gameData.player_2) playerIds.push(gameData.player_2);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", playerIds);

      if (profiles) {
        setPlayer1(profiles.find(p => p.user_id === gameData.player_1) || null);
        setPlayer2(profiles.find(p => p.user_id === gameData.player_2) || null);
      }
    } catch (error) {
      console.error("Error fetching game:", error);
      toast({
        title: t("games.error", { defaultValue: "Error" }),
        description: t("games.errorLoadingGame", { defaultValue: "Failed to load game" }),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [gameId, user?.id, t, toast, isSinglePlayer, initialPuzzle, initialSolution]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Timer effect
  useEffect(() => {
    if (isRunning && game?.status === 'active') {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, game?.status]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`sudoku-game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sudoku_games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          const newGame = payload.new as any;
          setGame(newGame);
          
          if (newGame.status === 'completed' && game?.status !== 'completed') {
            if (newGame.winner === user?.id) {
              playWin();
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              toast({
                title: t("games.youWon", { defaultValue: "🎉 You Won!" }),
                description: t("games.sudokuCompleted", { defaultValue: "Puzzle completed!" }),
              });
            } else if (newGame.winner && newGame.winner !== user?.id) {
              playLose();
              toast({
                title: t("games.youLost", { defaultValue: "Game Over" }),
                description: t("games.opponentWon", { defaultValue: "Your opponent finished first!" }),
                variant: "destructive",
              });
            }
            setIsRunning(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, game?.status, user?.id, playWin, playLose, toast, t]);

  const handleCellSelect = (row: number, col: number) => {
    if (puzzle[row]?.[col] !== 0) return; // Can't select original cells
    setSelectedCell([row, col]);
    playFlip();
  };

  const handleNumberInput = async (num: number) => {
    if (!selectedCell || !user) return;
    const [row, col] = selectedCell;
    
    if (puzzle[row][col] !== 0) return; // Can't modify original cells

    if (isNoteMode) {
      // Toggle note
      const newNotes = notes.map(r => r.map(c => new Set(c)));
      if (newNotes[row][col].has(num)) {
        newNotes[row][col].delete(num);
      } else {
        newNotes[row][col].add(num);
      }
      setNotes(newNotes);
      playFlip();
    } else {
      // Place number
      const newState = currentState.map(r => [...r]);
      newState[row][col] = num;
      setCurrentState(newState);
      
      // Clear notes for this cell
      const newNotes = notes.map(r => r.map(c => new Set(c)));
      newNotes[row][col].clear();
      setNotes(newNotes);
      
      // Check if correct
      if (num === solution[row][col]) {
        playMatch();
        errors.delete(`${row}-${col}`);
        setErrors(new Set(errors));
      } else {
        const newErrors = new Set(errors);
        newErrors.add(`${row}-${col}`);
        setErrors(newErrors);
      }

      // Save state to database
      await saveGameState(newState);

      // Check if puzzle is complete
      if (isPuzzleComplete(newState)) {
        await handlePuzzleComplete();
      }
    }
  };

  const handleClearCell = async () => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    
    if (puzzle[row][col] !== 0) return;

    const newState = currentState.map(r => [...r]);
    newState[row][col] = 0;
    setCurrentState(newState);
    
    errors.delete(`${row}-${col}`);
    setErrors(new Set(errors));
    
    await saveGameState(newState);
  };

  const saveGameState = async (state: SudokuGrid) => {
    // Skip database save for single player mode
    if (isSinglePlayer) return;
    if (!user || !game || !gameId) return;
    
    const isPlayer1 = game.player_1 === user.id;
    const updateField = isPlayer1 ? 'player_1_state' : 'player_2_state';
    
    await supabase
      .from("sudoku_games")
      .update({ [updateField]: state as unknown as Json })
      .eq("id", gameId);
  };

  const isPuzzleComplete = (state: SudokuGrid): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (state[row][col] !== solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  };

  const handlePuzzleComplete = async () => {
    if (!user) return;
    
    setIsRunning(false);
    playWin();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    // For single player mode, just update stats
    if (isSinglePlayer) {
      await updateStatsSinglePlayer();
      toast({
        title: t("games.puzzleComplete", { defaultValue: "🎉 Puzzle Complete!" }),
        description: t("games.timeWithHints", { 
          defaultValue: "Time: {{time}} | Hints: {{hints}}", 
          time: formatTime(timer),
          hints: hintsUsed 
        }),
      });
      return;
    }

    if (!game || !gameId) return;
    
    const isPlayer1 = game.player_1 === user.id;
    const timeField = isPlayer1 ? 'player_1_time' : 'player_2_time';
    const hintsField = isPlayer1 ? 'player_1_hints_used' : 'player_2_hints_used';
    
    // Update game with completion
    const updateData: Record<string, any> = {
      [timeField]: timer,
      [hintsField]: hintsUsed,
    };
    
    // For single player or if this is the first to complete
    if (!game.is_multiplayer || (!game.player_1_time && !game.player_2_time)) {
      if (!game.is_multiplayer) {
        updateData.status = 'completed';
        updateData.winner = user.id;
      } else {
        // First to complete in multiplayer
        updateData.status = 'completed';
        updateData.winner = user.id;
      }
    }
    
    await supabase
      .from("sudoku_games")
      .update(updateData)
      .eq("id", gameId);

    // Update stats
    await updateStats();

    toast({
      title: t("games.puzzleComplete", { defaultValue: "🎉 Puzzle Complete!" }),
      description: t("games.timeWithHints", { 
        defaultValue: "Time: {{time}} | Hints: {{hints}}", 
        time: formatTime(timer),
        hints: hintsUsed 
      }),
    });
  };

  const updateStatsSinglePlayer = async () => {
    if (!user) return;
    
    const bestTimeField = `${difficulty}_best_time` as const;
    const gamesWonField = `${difficulty}_games_won` as const;
    
    // Get or create stats
    const { data: existingStats } = await supabase
      .from("sudoku_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingStats) {
      const currentBest = (existingStats as any)[bestTimeField];
      const updates: Record<string, any> = {
        total_games_played: (existingStats.total_games_played || 0) + 1,
        [gamesWonField]: ((existingStats as any)[gamesWonField] || 0) + 1,
      };
      
      if (!currentBest || timer < currentBest) {
        updates[bestTimeField] = timer;
      }
      
      await supabase
        .from("sudoku_stats")
        .update(updates)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("sudoku_stats")
        .insert({
          user_id: user.id,
          [bestTimeField]: timer,
          [gamesWonField]: 1,
          total_games_played: 1,
        });
    }
  };

  const updateStats = async () => {
    if (!user || !game) return;
    
    const difficulty = game.difficulty as string;
    const bestTimeField = `${difficulty}_best_time` as const;
    const gamesWonField = `${difficulty}_games_won` as const;
    
    // Get or create stats
    const { data: existingStats } = await supabase
      .from("sudoku_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingStats) {
      const currentBest = (existingStats as any)[bestTimeField];
      const updates: Record<string, any> = {
        total_games_played: (existingStats.total_games_played || 0) + 1,
        [gamesWonField]: ((existingStats as any)[gamesWonField] || 0) + 1,
      };
      
      if (!currentBest || timer < currentBest) {
        updates[bestTimeField] = timer;
      }
      
      if (game.is_multiplayer) {
        updates.multiplayer_wins = (existingStats.multiplayer_wins || 0) + 1;
      }
      
      await supabase
        .from("sudoku_stats")
        .update(updates)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("sudoku_stats")
        .insert({
          user_id: user.id,
          [bestTimeField]: timer,
          [gamesWonField]: 1,
          total_games_played: 1,
          multiplayer_wins: game.is_multiplayer ? 1 : 0,
        });
    }
  };

  const handleHint = async () => {
    if (!selectedCell) {
      toast({
        title: t("games.selectCell", { defaultValue: "Select a cell" }),
        description: t("games.selectCellForHint", { defaultValue: "Select an empty cell to reveal" }),
      });
      return;
    }
    
    const [row, col] = selectedCell;
    if (puzzle[row][col] !== 0 || currentState[row][col] === solution[row][col]) {
      toast({
        description: t("games.cellAlreadyCorrect", { defaultValue: "This cell is already correct" }),
      });
      return;
    }

    const newState = currentState.map(r => [...r]);
    newState[row][col] = solution[row][col];
    setCurrentState(newState);
    setHintsUsed(prev => prev + 1);
    
    errors.delete(`${row}-${col}`);
    setErrors(new Set(errors));
    
    playMatch();
    
    // Save state
    await saveGameState(newState);

    // Update hints count in database
    if (user && game) {
      const isPlayer1 = game.player_1 === user.id;
      const hintsField = isPlayer1 ? 'player_1_hints_used' : 'player_2_hints_used';
      await supabase
        .from("sudoku_games")
        .update({ [hintsField]: hintsUsed + 1 })
        .eq("id", gameId);
    }

    // Check if complete
    if (isPuzzleComplete(newState)) {
      await handlePuzzleComplete();
    }
  };

  const handleValidate = () => {
    const newErrors = new Set<string>();
    let correctCount = 0;
    let wrongCount = 0;
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentState[row][col] !== 0 && puzzle[row][col] === 0) {
          if (currentState[row][col] !== solution[row][col]) {
            newErrors.add(`${row}-${col}`);
            wrongCount++;
          } else {
            correctCount++;
          }
        }
      }
    }
    
    setErrors(newErrors);
    
    if (wrongCount > 0) {
      toast({
        title: t("games.validationResult", { defaultValue: "Validation" }),
        description: t("games.wrongCells", { defaultValue: "{{count}} incorrect cells found", count: wrongCount }),
        variant: "destructive",
      });
    } else if (correctCount > 0) {
      playMatch();
      toast({
        title: t("games.allCorrect", { defaultValue: "Looking good!" }),
        description: t("games.noErrors", { defaultValue: "No errors found so far!" }),
      });
    }
  };

  const handleReset = async () => {
    const resetState = puzzle.map(row => [...row]);
    setCurrentState(resetState);
    setNotes(initializeNotes());
    setErrors(new Set());
    setTimer(0);
    setHintsUsed(0);
    setIsRunning(true);
    
    await saveGameState(resetState);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptGame = async () => {
    if (!user) return;
    
    await supabase
      .from("sudoku_games")
      .update({ 
        status: 'active',
        player_2_state: puzzle as unknown as Json
      })
      .eq("id", gameId);

    toast({
      title: t("games.gameAccepted", { defaultValue: "Game Accepted!" }),
      description: t("games.goodLuck", { defaultValue: "Good luck!" }),
    });
    
    setIsRunning(true);
    fetchGame();
  };

  const handleDeclineGame = async () => {
    await supabase
      .from("sudoku_games")
      .update({ status: 'declined' })
      .eq("id", gameId);

    toast({
      title: t("games.gameDeclined", { defaultValue: "Game Declined" }),
    });
    
    onBack();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("games.loading", { defaultValue: "Loading..." })}</p>
        </CardContent>
      </Card>
    );
  }

  if (!game) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("games.notFound", { defaultValue: "Game not found" })}</p>
          <Button onClick={onBack} className="mt-4">{t("games.back", { defaultValue: "Back" })}</Button>
        </CardContent>
      </Card>
    );
  }

  const isPlayer1 = game.player_1 === user?.id;
  const isInvitee = game.player_2 === user?.id && game.status === 'pending';
  const opponent = isPlayer1 ? player2 : player1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t("games.back", { defaultValue: "Back" })}
        </Button>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(timer)}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Lightbulb className="w-3 h-3" />
            {hintsUsed} {t("games.hints", { defaultValue: "hints" })}
          </Badge>
          <Badge className="capitalize">{game.difficulty}</Badge>
        </div>
      </div>

      {/* Pending invitation */}
      {isInvitee && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={player1?.avatar_url || undefined} />
                  <AvatarFallback>{(player1?.display_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {t("games.challengeFrom", { 
                      defaultValue: "{{name}} challenged you!", 
                      name: player1?.display_name || "Someone" 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{game.difficulty} difficulty</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDeclineGame}>
                  {t("games.decline", { defaultValue: "Decline" })}
                </Button>
                <Button onClick={handleAcceptGame}>
                  {t("games.accept", { defaultValue: "Accept" })}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game completed */}
      {game.status === 'completed' && (
        <Card className={cn(
          "border-2",
          game.winner === user?.id ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"
        )}>
          <CardContent className="py-4 text-center">
            <Trophy className={cn(
              "w-8 h-8 mx-auto mb-2",
              game.winner === user?.id ? "text-green-500" : "text-red-500"
            )} />
            <p className="font-bold text-lg">
              {game.winner === user?.id 
                ? t("games.youWonSudoku", { defaultValue: "You completed the puzzle!" })
                : t("games.opponentWonSudoku", { defaultValue: "Opponent finished first!" })
              }
            </p>
            <p className="text-muted-foreground">
              {t("games.finalTime", { defaultValue: "Time: {{time}}", time: formatTime(timer) })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Multiplayer opponent info */}
      {game.is_multiplayer && opponent && game.status === 'active' && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={opponent.avatar_url || undefined} />
                <AvatarFallback>{(opponent.display_name || "?")[0]}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <span className="font-medium">{t("games.vs", { defaultValue: "vs" })} {opponent.display_name}</span>
                <span className="text-muted-foreground ml-2">(racing for same puzzle)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sudoku Board */}
      {(!isInvitee || game.status === 'active') && (
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          <SudokuBoard
            puzzle={puzzle}
            currentState={currentState}
            notes={notes}
            selectedCell={selectedCell}
            errors={errors}
            onCellSelect={handleCellSelect}
            disabled={game.status !== 'active'}
          />
          
          <SudokuControls
            onNumberInput={handleNumberInput}
            onClear={handleClearCell}
            onHint={handleHint}
            onValidate={handleValidate}
            onReset={handleReset}
            isNoteMode={isNoteMode}
            onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
            disabled={game.status !== 'active'}
          />
        </div>
      )}
    </div>
  );
};
