import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trophy, Clock, Check, X, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Player {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MemoryMatchGameProps {
  gameId: string;
  onBack: () => void;
}

const CARD_EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"];

export const MemoryMatchGame = ({ gameId, onBack }: MemoryMatchGameProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playFlip, playMatch, playNoMatch, playWin, playLose, playDraw, playGameStart } = useGameSounds();
  const [game, setGame] = useState<any>(null);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [creatingRematch, setCreatingRematch] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  const fetchGame = useCallback(async () => {
    const { data, error } = await supabase
      .from("memory_match_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (error) {
      console.error("Error fetching game:", error);
      toast.error(t("games.fetchError", { defaultValue: "Failed to load game" }));
      return;
    }

    setGame(data);
    
    // Fetch player profiles
    const playerIds = [data.player_1, data.player_2].filter(Boolean);
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", playerIds);

      if (profiles) {
        setPlayer1(profiles.find((p) => p.user_id === data.player_1) || null);
        setPlayer2(profiles.find((p) => p.user_id === data.player_2) || null);
      }
    }
    setLoading(false);
  }, [gameId, t]);

  useEffect(() => {
    fetchGame();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`memory_match_game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "memory_match_games",
          filter: `id=eq.${gameId}`,
        },
        () => {
          fetchGame();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, fetchGame]);

  const generateCards = () => {
    // Create pairs of cards (12 pairs = 24 cards for a 6x4 grid)
    const selectedEmojis = CARD_EMOJIS.slice(0, 8);
    const pairs = [...selectedEmojis, ...selectedEmojis];
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
  };

  const handleAcceptInvite = async () => {
    if (!user) return;
    
    const cards = generateCards();
    const { error } = await supabase
      .from("memory_match_games")
      .update({
        player_2: user.id,
        status: "active",
        cards: cards,
        revealed: Array(cards.length).fill("hidden"),
      })
      .eq("id", gameId);

    if (error) {
      toast.error(t("games.acceptError", { defaultValue: "Failed to accept invite" }));
    } else {
      playGameStart();
      toast.success(t("games.gameStarted", { defaultValue: "Game started!" }));
    }
  };

  const handleDeclineInvite = async () => {
    const { error } = await supabase
      .from("memory_match_games")
      .update({ status: "declined" })
      .eq("id", gameId);

    if (error) {
      toast.error(t("games.declineError", { defaultValue: "Failed to decline invite" }));
    } else {
      toast.info(t("games.inviteDeclined", { defaultValue: "Invite declined" }));
      onBack();
    }
  };

  const handleCardClick = async (index: number) => {
    if (!user || !game || flipping) return;
    if (game.current_turn !== user.id) return;
    if (game.matched[index] === "matched") return;
    if (flippedCards.includes(index)) return;

    // Play flip sound
    playFlip();

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setFlipping(true);
      const [first, second] = newFlipped;
      const isMatch = game.cards[first] === game.cards[second];

      // Wait a moment to show both cards
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newMatched = [...game.matched];
      let newPlayer1Score = game.player_1_score;
      let newPlayer2Score = game.player_2_score;
      let newCurrentTurn = game.current_turn;

      if (isMatch) {
        newMatched[first] = "matched";
        newMatched[second] = "matched";
        if (user.id === game.player_1) {
          newPlayer1Score++;
        } else {
          newPlayer2Score++;
        }
        playMatch();
        toast.success(t("games.matchFound", { defaultValue: "Match found! +1 point" }));
      } else {
        // Switch turn on no match
        playNoMatch();
        newCurrentTurn = game.current_turn === game.player_1 ? game.player_2 : game.player_1;
      }

      // Check if game is complete
      const matchedCount = newMatched.filter(m => m === "matched").length;
      const isComplete = matchedCount === game.cards.length;
      let winner = null;
      let newStatus = game.status;

      if (isComplete) {
        newStatus = newPlayer1Score === newPlayer2Score ? "draw" : "completed";
        if (newPlayer1Score > newPlayer2Score) {
          winner = game.player_1;
        } else if (newPlayer2Score > newPlayer1Score) {
          winner = game.player_2;
        }
        
        // Play game end sound
        if (newStatus === "draw") {
          playDraw();
        } else if (winner === user.id) {
          playWin();
        } else {
          playLose();
        }
      }

      const { error } = await supabase
        .from("memory_match_games")
        .update({
          matched: newMatched,
          player_1_score: newPlayer1Score,
          player_2_score: newPlayer2Score,
          current_turn: newCurrentTurn,
          status: newStatus,
          winner: winner,
        })
        .eq("id", gameId);

      if (error) {
        console.error("Error updating game:", error);
        toast.error(t("games.moveError", { defaultValue: "Failed to make move" }));
      }

      setFlippedCards([]);
      setFlipping(false);
    }
  };

  const handleRematch = async () => {
    if (!user || !game) return;
    
    setCreatingRematch(true);
    const opponentId = game.player_1 === user.id ? game.player_2 : game.player_1;
    
    try {
      const { data, error } = await supabase
        .from("memory_match_games")
        .insert({
          player_1: user.id,
          player_2: opponentId,
          current_turn: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success(t("games.rematchCreated", { defaultValue: "Rematch created! Waiting for opponent..." }));
      navigate(`/games?memory=${data.id}`, { replace: true });
      window.location.reload();
    } catch (error) {
      console.error("Error creating rematch:", error);
      toast.error(t("games.rematchError", { defaultValue: "Failed to create rematch" }));
    } finally {
      setCreatingRematch(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{t("games.notFound", { defaultValue: "Game not found" })}</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("games.backToGames", { defaultValue: "Back to Games" })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPlayer1 = user?.id === game.player_1;
  const isPlayer2 = user?.id === game.player_2;
  const isMyTurn = game.current_turn === user?.id;
  const isPending = game.status === "pending";
  const isActive = game.status === "active";
  const isGameOver = game.status === "completed" || game.status === "draw" || game.status === "declined";

  const getPlayerName = (player: Player | null) => {
    return player?.display_name || t("games.anonymous", { defaultValue: "Anonymous" });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("games.back", { defaultValue: "Back" })}
          </Button>
          <CardTitle className="text-lg">{t("games.memoryMatch", { defaultValue: "Memory Match" })}</CardTitle>
          <div className="w-16" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Players display with scores */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`relative ${isActive && game.current_turn === game.player_1 ? "ring-2 ring-primary rounded-full" : ""}`}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={player1?.avatar_url || ""} />
                <AvatarFallback>{getPlayerName(player1).charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <p className="font-medium text-sm">{getPlayerName(player1)}</p>
              <p className="text-xs text-muted-foreground">{t("games.score", { defaultValue: "Score" })}: {game.player_1_score}</p>
            </div>
          </div>

          <div className="text-center">
            <span className="text-lg font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium text-sm">{player2 ? getPlayerName(player2) : t("games.waiting", { defaultValue: "Waiting..." })}</p>
              <p className="text-xs text-muted-foreground">{t("games.score", { defaultValue: "Score" })}: {game.player_2_score}</p>
            </div>
            <div className={`relative ${isActive && game.current_turn === game.player_2 ? "ring-2 ring-primary rounded-full" : ""}`}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={player2?.avatar_url || ""} />
                <AvatarFallback>{player2 ? getPlayerName(player2).charAt(0) : "?"}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Pending invite actions */}
        {isPending && !isPlayer1 && (
          <div className="flex gap-2 justify-center">
            <Button onClick={handleAcceptInvite} className="gap-2">
              <Check className="w-4 h-4" />
              {t("games.acceptInvite", { defaultValue: "Accept Invite" })}
            </Button>
            <Button variant="outline" onClick={handleDeclineInvite} className="gap-2">
              <X className="w-4 h-4" />
              {t("games.decline", { defaultValue: "Decline" })}
            </Button>
          </div>
        )}

        {isPending && isPlayer1 && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">
              {t("games.waitingForOpponent", { defaultValue: "Waiting for opponent to accept..." })}
            </p>
          </div>
        )}

        {/* Game board */}
        {isActive && game.cards.length > 0 && (
          <>
            <div className="text-center py-2">
              {isMyTurn ? (
                <p className="text-primary font-medium">{t("games.yourTurn", { defaultValue: "Your turn! Flip two cards." })}</p>
              ) : (
                <p className="text-muted-foreground">{t("games.opponentTurn", { defaultValue: "Waiting for opponent..." })}</p>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {game.cards.map((emoji: string, index: number) => {
                const isMatched = game.matched[index] === "matched";
                const isFlipped = flippedCards.includes(index);
                const showCard = isMatched || isFlipped;

                return (
                  <button
                    key={index}
                    onClick={() => handleCardClick(index)}
                    disabled={!isMyTurn || isMatched || flipping}
                    className={`
                      aspect-square rounded-lg text-3xl flex items-center justify-center
                      transition-all duration-300 transform
                      ${isMatched 
                        ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500" 
                        : showCard 
                          ? "bg-primary/10 border-2 border-primary" 
                          : "bg-muted hover:bg-muted/80 border-2 border-border"}
                      ${!isMyTurn || isMatched || flipping ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                    `}
                  >
                    {showCard ? emoji : "❓"}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Game over state */}
        {isGameOver && game.status !== "declined" && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
            {game.status === "draw" ? (
              <p className="text-lg font-bold">{t("games.draw", { defaultValue: "It's a draw!" })}</p>
            ) : game.winner === user?.id ? (
              <p className="text-lg font-bold text-green-600">{t("games.youWin", { defaultValue: "You win!" })}</p>
            ) : (
              <p className="text-lg font-bold text-red-600">{t("games.youLose", { defaultValue: "You lose!" })}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {t("games.finalScore", { defaultValue: "Final Score" })}: {game.player_1_score} - {game.player_2_score}
            </p>
          </div>
        )}

        {game.status === "declined" && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <X className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p className="text-muted-foreground">
              {t("games.inviteDeclined", { defaultValue: "Game invite was declined" })}
            </p>
          </div>
        )}

        {/* Rematch button */}
        {isGameOver && game.status !== "declined" && (
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
