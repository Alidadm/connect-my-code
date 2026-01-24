import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TicTacToeBoard } from "./TicTacToeBoard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trophy, Clock, Check, X, RotateCcw, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Player {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TicTacToeGameProps {
  gameId: string | null;
  isAIGame?: boolean;
  onBack: () => void;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

// AI Constants
const AI_PLAYER_NAME = "DolphySN";

// Check winner helper
const checkWinnerStatic = (board: string[]): string | null => {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

// AI move logic - minimax with some randomness for balanced play
const getAIMove = (board: string[]): number => {
  const emptyCells = board.map((cell, index) => cell === '' ? index : -1).filter(i => i !== -1);
  
  if (emptyCells.length === 0) return -1;
  
  // 30% chance of random move for easier gameplay
  if (Math.random() < 0.3) {
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }
  
  // Check for winning move
  for (const cell of emptyCells) {
    const testBoard = [...board];
    testBoard[cell] = 'o';
    if (checkWinnerStatic(testBoard) === 'o') {
      return cell;
    }
  }
  
  // Block player's winning move
  for (const cell of emptyCells) {
    const testBoard = [...board];
    testBoard[cell] = 'x';
    if (checkWinnerStatic(testBoard) === 'x') {
      return cell;
    }
  }
  
  // Take center if available
  if (board[4] === '') return 4;
  
  // Take a corner
  const corners = [0, 2, 6, 8].filter(c => board[c] === '');
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  
  // Take any remaining
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};

export const TicTacToeGame = ({ gameId, isAIGame = false, onBack }: TicTacToeGameProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFlip, playWin, playLose, playDraw, playGameStart } = useGameSounds();
  
  // Multiplayer game state
  const [game, setGame] = useState<any>(null);
  const [playerX, setPlayerX] = useState<Player | null>(null);
  const [playerO, setPlayerO] = useState<Player | null>(null);
  const [loading, setLoading] = useState(!isAIGame);
  const [making, setMaking] = useState(false);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [creatingRematch, setCreatingRematch] = useState(false);
  
  // AI game state
  const [aiBoard, setAiBoard] = useState<string[]>(Array(9).fill(''));
  const [aiCurrentTurn, setAiCurrentTurn] = useState<'x' | 'o'>('x');
  const [aiStatus, setAiStatus] = useState<'active' | 'completed' | 'draw'>('active');
  const [aiWinner, setAiWinner] = useState<'player' | 'ai' | null>(null);

  // Initialize AI game
  useEffect(() => {
    if (isAIGame) {
      playGameStart();
      setAiBoard(Array(9).fill(''));
      setAiCurrentTurn('x');
      setAiStatus('active');
      setAiWinner(null);
      setWinningCells([]);
    }
  }, [isAIGame, playGameStart]);

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    
    const { data, error } = await supabase
      .from("tic_tac_toe_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (error) {
      console.error("Error fetching game:", error);
      return;
    }

    setGame(data);

    // Check for winner
    if (data.status === "completed" && data.winner) {
      const cells = findWinningCells(data.board);
      setWinningCells(cells);
    }

    // Fetch player profiles
    const playerIds = [data.player_x, data.player_o].filter(Boolean);
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", playerIds);

      if (profiles) {
        setPlayerX(profiles.find(p => p.user_id === data.player_x) || null);
        setPlayerO(profiles.find(p => p.user_id === data.player_o) || null);
      }
    }

    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    if (!isAIGame && gameId) {
      fetchGame();

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`game-${gameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tic_tac_toe_games',
            filter: `id=eq.${gameId}`
          },
          (payload) => {
            setGame(payload.new);
            if (payload.new.status === "completed" && payload.new.winner) {
              const cells = findWinningCells(payload.new.board);
              setWinningCells(cells);
              if (payload.new.winner === user?.id) {
                playWin();
                toast.success(t("games.youWon", { defaultValue: "🎉 You won!" }));
              } else {
                playLose();
                toast.info(t("games.youLost", { defaultValue: "You lost. Better luck next time!" }));
              }
            } else if (payload.new.status === "draw") {
              playDraw();
              toast.info(t("games.draw", { defaultValue: "It's a draw!" }));
            } else if (payload.new.current_turn !== game?.current_turn) {
              toast.info(t("games.opponentMoved", { defaultValue: "Your opponent made a move!" }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [gameId, isAIGame, fetchGame, user?.id, game?.current_turn, t, playWin, playLose, playDraw]);

  const findWinningCells = (board: string[]): number[] => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combo;
      }
    }
    return [];
  };

  const checkWinner = (board: string[]): string | null => {
    return checkWinnerStatic(board);
  };

  // AI Game cell click handler
  const handleAICellClick = (index: number) => {
    if (aiStatus !== 'active' || aiCurrentTurn !== 'x' || aiBoard[index] !== '' || making) return;

    playFlip();
    setMaking(true);

    const newBoard = [...aiBoard];
    newBoard[index] = 'x';
    setAiBoard(newBoard);

    const winner = checkWinner(newBoard);
    const isDraw = !winner && newBoard.every(cell => cell !== '');

    if (winner) {
      setAiStatus('completed');
      setAiWinner('player');
      setWinningCells(findWinningCells(newBoard));
      playWin();
      toast.success(t("games.youWon", { defaultValue: "🎉 You won!" }));
      setMaking(false);
      return;
    }

    if (isDraw) {
      setAiStatus('draw');
      playDraw();
      toast.info(t("games.draw", { defaultValue: "It's a draw!" }));
      setMaking(false);
      return;
    }

    // AI's turn
    setAiCurrentTurn('o');
    
    // AI makes move after a short delay
    setTimeout(() => {
      const aiMove = getAIMove(newBoard);
      if (aiMove !== -1) {
        playFlip();
        const afterAiBoard = [...newBoard];
        afterAiBoard[aiMove] = 'o';
        setAiBoard(afterAiBoard);

        const aiWins = checkWinner(afterAiBoard);
        const aiDraw = !aiWins && afterAiBoard.every(cell => cell !== '');

        if (aiWins) {
          setAiStatus('completed');
          setAiWinner('ai');
          setWinningCells(findWinningCells(afterAiBoard));
          playLose();
          toast.info(t("games.youLost", { defaultValue: "You lost. Better luck next time!" }));
        } else if (aiDraw) {
          setAiStatus('draw');
          playDraw();
          toast.info(t("games.draw", { defaultValue: "It's a draw!" }));
        } else {
          setAiCurrentTurn('x');
        }
      }
      setMaking(false);
    }, 600);
  };

  // Multiplayer cell click handler
  const handleCellClick = async (index: number) => {
    if (isAIGame) {
      handleAICellClick(index);
      return;
    }

    if (!user || !game || making) return;
    
    const isPlayerX = game.player_x === user.id;
    const isPlayerO = game.player_o === user.id;
    const isMyTurn = (isPlayerX && game.current_turn === 'x') || (isPlayerO && game.current_turn === 'o');

    if (!isMyTurn || game.board[index] !== '' || game.status !== 'active') return;

    playFlip();
    setMaking(true);
    const newBoard = [...game.board];
    newBoard[index] = game.current_turn;

    const winner = checkWinner(newBoard);
    const isDraw = !winner && newBoard.every(cell => cell !== '');

    try {
      const updateData: any = {
        board: newBoard,
        current_turn: game.current_turn === 'x' ? 'o' : 'x',
      };

      if (winner) {
        updateData.status = 'completed';
        updateData.winner = winner === 'x' ? game.player_x : game.player_o;
      } else if (isDraw) {
        updateData.status = 'draw';
      }

      const { error } = await supabase
        .from("tic_tac_toe_games")
        .update(updateData)
        .eq("id", gameId);

      if (error) throw error;
    } catch (error) {
      console.error("Error making move:", error);
      toast.error(t("games.moveError", { defaultValue: "Failed to make move" }));
    } finally {
      setMaking(false);
    }
  };

  const handleAcceptGame = async () => {
    try {
      const { error } = await supabase
        .from("tic_tac_toe_games")
        .update({ status: "active" })
        .eq("id", gameId);

      if (error) throw error;
      playGameStart();
      toast.success(t("games.gameStarted", { defaultValue: "Game started!" }));
    } catch (error) {
      console.error("Error accepting game:", error);
    }
  };

  const handleDeclineGame = async () => {
    try {
      const { error } = await supabase
        .from("tic_tac_toe_games")
        .update({ status: "declined" })
        .eq("id", gameId);

      if (error) throw error;
      toast.info(t("games.gameDeclined", { defaultValue: "Game declined" }));
      onBack();
    } catch (error) {
      console.error("Error declining game:", error);
    }
  };

  const handleRematch = async () => {
    if (isAIGame) {
      // Reset AI game
      setAiBoard(Array(9).fill(''));
      setAiCurrentTurn('x');
      setAiStatus('active');
      setAiWinner(null);
      setWinningCells([]);
      playGameStart();
      return;
    }

    if (!user || !game) return;
    
    setCreatingRematch(true);
    const opponentId = game.player_x === user.id ? game.player_o : game.player_x;
    
    try {
      const { data, error } = await supabase
        .from("tic_tac_toe_games")
        .insert({
          player_x: user.id,
          player_o: opponentId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success(t("games.rematchCreated", { defaultValue: "Rematch created! Waiting for opponent..." }));
      navigate(`/games?game=${data.id}`, { replace: true });
      window.location.reload();
    } catch (error) {
      console.error("Error creating rematch:", error);
      toast.error(t("games.rematchError", { defaultValue: "Failed to create rematch" }));
    } finally {
      setCreatingRematch(false);
    }
  };

  // AI Game UI
  if (isAIGame) {
    const isGameOver = aiStatus === 'completed' || aiStatus === 'draw';
    const isMyTurn = aiCurrentTurn === 'x' && aiStatus === 'active';

    const getAIStatusMessage = () => {
      if (aiStatus === 'completed') {
        return aiWinner === 'player' 
          ? t("games.youWon", { defaultValue: "🎉 You won!" })
          : t("games.youLost", { defaultValue: "You lost. Better luck next time!" });
      }
      if (aiStatus === 'draw') {
        return t("games.draw", { defaultValue: "It's a draw!" });
      }
      if (isMyTurn) {
        return t("games.yourTurn", { defaultValue: "Your turn!" });
      }
      return t("games.aiThinking", { defaultValue: "DolphySN is thinking..." });
    };

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back", { defaultValue: "Back" })}
            </Button>
            <Badge variant={isGameOver ? "secondary" : isMyTurn ? "default" : "outline"}>
              {isGameOver ? (
                <Trophy className="w-3 h-3 mr-1" />
              ) : (
                <Clock className="w-3 h-3 mr-1" />
              )}
              {getAIStatusMessage()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Players */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-10 h-10 ring-2 ring-primary">
                <AvatarFallback className="bg-primary text-primary-foreground">✕</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{t("games.you", { defaultValue: "You" })}</p>
                <Badge variant="outline" className="text-xs">{t("games.you", { defaultValue: "You" })}</Badge>
              </div>
            </div>

            <span className="text-xl font-bold text-muted-foreground">VS</span>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-medium text-sm">{AI_PLAYER_NAME}</p>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Bot className="w-3 h-3" />
                  AI
                </Badge>
              </div>
              <Avatar className="w-10 h-10 ring-2 ring-destructive">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Game Board */}
          <TicTacToeBoard
            board={aiBoard}
            onCellClick={handleCellClick}
            disabled={!isMyTurn || isGameOver || making}
            winningCells={winningCells}
          />

          {/* Turn indicator */}
          {aiStatus === 'active' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isMyTurn 
                  ? t("games.clickToPlay", { defaultValue: "Click a cell to make your move" })
                  : t("games.aiThinking", { defaultValue: "DolphySN is thinking..." })
                }
              </p>
            </div>
          )}

          {/* Play Again button when game is over */}
          {isGameOver && (
            <div className="pt-2 border-t">
              <Button 
                onClick={handleRematch} 
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t("games.playAgain", { defaultValue: "Play Again" })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multiplayer UI (original logic)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("games.notFound", { defaultValue: "Game not found" })}</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("games.back", { defaultValue: "Back" })}
        </Button>
      </div>
    );
  }

  const isPlayerX = game.player_x === user?.id;
  const isPlayerO = game.player_o === user?.id;
  const isMyTurn = (isPlayerX && game.current_turn === 'x') || (isPlayerO && game.current_turn === 'o');
  const isPending = game.status === 'pending';
  const isInvitee = isPending && isPlayerO;
  const isGameOver = game.status === 'completed' || game.status === 'draw';

  const getStatusMessage = () => {
    if (isPending && isPlayerO) {
      return t("games.acceptInvite", { defaultValue: "Accept this game invite?" });
    }
    if (isPending) {
      return t("games.waitingForOpponent", { defaultValue: "Waiting for opponent to accept..." });
    }
    if (game.status === 'declined') {
      return t("games.inviteDeclined", { defaultValue: "Invite was declined" });
    }
    if (game.status === 'completed') {
      if (game.winner === user?.id) {
        return t("games.youWon", { defaultValue: "🎉 You won!" });
      }
      return t("games.youLost", { defaultValue: "You lost. Better luck next time!" });
    }
    if (game.status === 'draw') {
      return t("games.draw", { defaultValue: "It's a draw!" });
    }
    if (isMyTurn) {
      return t("games.yourTurn", { defaultValue: "Your turn!" });
    }
    return t("games.opponentTurn", { defaultValue: "Waiting for opponent..." });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back", { defaultValue: "Back" })}
          </Button>
          <Badge variant={isGameOver ? "secondary" : isMyTurn ? "default" : "outline"}>
            {isGameOver ? (
              <Trophy className="w-3 h-3 mr-1" />
            ) : (
              <Clock className="w-3 h-3 mr-1" />
            )}
            {getStatusMessage()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Players */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10 ring-2 ring-primary">
              <AvatarImage src={playerX?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">✕</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{playerX?.display_name || t("games.playerX", { defaultValue: "Player X" })}</p>
              {isPlayerX && <Badge variant="outline" className="text-xs">{t("games.you", { defaultValue: "You" })}</Badge>}
            </div>
          </div>

          <span className="text-xl font-bold text-muted-foreground">VS</span>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-medium text-sm">{playerO?.display_name || t("games.playerO", { defaultValue: "Player O" })}</p>
              {isPlayerO && <Badge variant="outline" className="text-xs">{t("games.you", { defaultValue: "You" })}</Badge>}
            </div>
            <Avatar className="w-10 h-10 ring-2 ring-destructive">
              <AvatarImage src={playerO?.avatar_url || undefined} />
              <AvatarFallback className="bg-destructive text-destructive-foreground">○</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Accept/Decline for invitee */}
        {isInvitee && (
          <div className="flex gap-2 justify-center">
            <Button onClick={handleAcceptGame} className="gap-2">
              <Check className="w-4 h-4" />
              {t("games.accept", { defaultValue: "Accept" })}
            </Button>
            <Button variant="destructive" onClick={handleDeclineGame} className="gap-2">
              <X className="w-4 h-4" />
              {t("games.decline", { defaultValue: "Decline" })}
            </Button>
          </div>
        )}

        {/* Game Board */}
        <TicTacToeBoard
          board={game.board}
          onCellClick={handleCellClick}
          disabled={!isMyTurn || isGameOver || isPending || making}
          winningCells={winningCells}
        />

        {/* Turn indicator */}
        {game.status === 'active' && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isMyTurn 
                ? t("games.clickToPlay", { defaultValue: "Click a cell to make your move" })
                : t("games.waitingMove", { defaultValue: "Waiting for opponent's move..." })
              }
            </p>
          </div>
        )}

        {/* Rematch button when game is over */}
        {isGameOver && (
          <div className="pt-2 border-t">
            <Button 
              onClick={handleRematch} 
              className="w-full gap-2"
              disabled={creatingRematch}
            >
              {creatingRematch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {t("games.rematch", { defaultValue: "Rematch" })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
