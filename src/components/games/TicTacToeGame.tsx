import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TicTacToeBoard } from "./TicTacToeBoard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trophy, Clock, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Player {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TicTacToeGameProps {
  gameId: string;
  onBack: () => void;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

export const TicTacToeGame = ({ gameId, onBack }: TicTacToeGameProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [playerX, setPlayerX] = useState<Player | null>(null);
  const [playerO, setPlayerO] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [making, setMaking] = useState(false);
  const [winningCells, setWinningCells] = useState<number[]>([]);

  const fetchGame = useCallback(async () => {
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
              toast.success(t("games.youWon", { defaultValue: "🎉 You won!" }));
            } else {
              toast.info(t("games.youLost", { defaultValue: "You lost. Better luck next time!" }));
            }
          } else if (payload.new.status === "draw") {
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
  }, [gameId, fetchGame, user?.id, game?.current_turn, t]);

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
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const handleCellClick = async (index: number) => {
    if (!user || !game || making) return;
    
    const isPlayerX = game.player_x === user.id;
    const isPlayerO = game.player_o === user.id;
    const isMyTurn = (isPlayerX && game.current_turn === 'x') || (isPlayerO && game.current_turn === 'o');

    if (!isMyTurn || game.board[index] !== '' || game.status !== 'active') return;

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
        <p className="text-muted-foreground">Game not found</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
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
              <p className="font-medium text-sm">{playerX?.display_name || "Player X"}</p>
              {isPlayerX && <Badge variant="outline" className="text-xs">You</Badge>}
            </div>
          </div>

          <span className="text-xl font-bold text-muted-foreground">VS</span>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-medium text-sm">{playerO?.display_name || "Player O"}</p>
              {isPlayerO && <Badge variant="outline" className="text-xs">You</Badge>}
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
      </CardContent>
    </Card>
  );
};
