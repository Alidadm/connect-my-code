import { useEffect, useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RotateCcw, Bot, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTetris } from "@/hooks/useTetris";
import { TetrisBoard } from "./TetrisBoard";
import { TetrisNextPiece } from "./TetrisNextPiece";
import { TetrisControls } from "./TetrisControls";
import { TetrisLeaderboard } from "./TetrisLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGameSounds } from "@/hooks/useGameSounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TetrisGameProps {
  onBack: () => void;
  isAIGame?: boolean;
}

export const TetrisGame = ({ onBack, isAIGame = false }: TetrisGameProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playWin, playLose } = useGameSounds();
  const [gameMode, setGameMode] = useState<"solo" | "ai" | null>(isAIGame ? "ai" : null);
  const [aiScore, setAiScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const {
    state,
    ghostY,
    startGame,
    togglePause,
    movePiece,
    rotate,
    hardDrop,
    softDrop,
  } = useTetris();

  // AI opponent simulation - generates a random score based on difficulty
  const generateAIScore = useCallback(() => {
    // AI scores between 2000-15000 based on "difficulty"
    const baseScore = 2000 + Math.random() * 13000;
    return Math.floor(baseScore);
  }, []);

  // Handle game start
  const handleStartGame = (mode: "solo" | "ai") => {
    setGameMode(mode);
    setScoreSaved(false);
    setIsLightboxOpen(true);
    if (mode === "ai") {
      setAiScore(generateAIScore());
    }
    startGame();
  };

  // Save score when game ends
  useEffect(() => {
    const saveScore = async () => {
      if (state.gameOver && user && !scoreSaved && state.score > 0) {
        setScoreSaved(true);

        // Check if player won against AI
        const didWinVsAI = gameMode === "ai" && state.score > aiScore;
        const didLoseVsAI = gameMode === "ai" && state.score <= aiScore;

        if (didWinVsAI) {
          playWin();
        } else if (didLoseVsAI) {
          playLose();
        }

        try {
          // Save high score
          const { error: scoreError } = await supabase.from("tetris_high_scores").insert({
            user_id: user.id,
            score: state.score,
            level: state.level,
            lines_cleared: state.linesCleared,
            difficulty: "normal",
            game_mode: gameMode || "solo",
          });

          if (scoreError) throw scoreError;

          // Update AI wins/losses if applicable
          if (gameMode === "ai") {
            // First try to get existing stats
            const { data: existingStats } = await supabase
              .from("tetris_stats")
              .select("ai_wins, ai_losses")
              .eq("user_id", user.id)
              .maybeSingle();

            if (existingStats) {
              // Update existing stats
              await supabase
                .from("tetris_stats")
                .update({
                  ai_wins: existingStats.ai_wins + (didWinVsAI ? 1 : 0),
                  ai_losses: existingStats.ai_losses + (didLoseVsAI ? 1 : 0),
                })
                .eq("user_id", user.id);
            }
          }

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["tetris-leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["tetris-stats", user.id] });

          toast.success(t("games.tetris.scoreSaved", { defaultValue: "Score saved!" }));
        } catch (error) {
          console.error("Error saving score:", error);
        }
      }
    };

    saveScore();
  }, [state.gameOver, user, state.score, scoreSaved, gameMode, aiScore, state.level, state.linesCleared, queryClient, t, playWin, playLose]);

  // Keyboard controls
  useEffect(() => {
    if (!state.isPlaying || !isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          movePiece(1, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          rotate();
          break;
        case "ArrowDown":
          e.preventDefault();
          softDrop();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
        case "p":
        case "P":
          e.preventDefault();
          togglePause();
          break;
        case "Escape":
          e.preventDefault();
          if (!state.isPaused) {
            togglePause();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isPlaying, state.gameOver, state.isPaused, isLightboxOpen, movePiece, rotate, softDrop, hardDrop, togglePause]);

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    if (state.isPlaying && !state.isPaused && !state.gameOver) {
      togglePause();
    }
  };

  // Mode selector
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              {t("games.tetris.title", { defaultValue: "Tetris" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            {t("games.tetris.selectMode", { defaultValue: "Select game mode" })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => handleStartGame("solo")}
            >
              <User className="w-8 h-8" />
              <span>{t("games.tetris.soloMode", { defaultValue: "Solo Play" })}</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2"
              onClick={() => handleStartGame("ai")}
            >
              <Bot className="w-8 h-8" />
              <span>{t("games.tetris.vsAI", { defaultValue: "vs AI" })}</span>
            </Button>
          </div>

          {/* Leaderboard shown in main view */}
          <TetrisLeaderboard />
        </CardContent>
      </Card>

      {/* Game Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 bg-background/95 backdrop-blur-md">
          <DialogHeader className="p-4 pb-2 border-b pr-12 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span>🎮</span>
              {t("games.tetris.title", { defaultValue: "Tetris" })}
              {gameMode === "ai" && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (vs AI)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {/* Game Area */}
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-center lg:items-start min-h-full">
              {/* Left Panel - Next Piece & Controls */}
              <div className="flex flex-col gap-4 w-full lg:w-auto order-2 lg:order-1">
                {state.nextPiece && <TetrisNextPiece piece={state.nextPiece} />}
                <TetrisControls
                  onMoveLeft={() => movePiece(-1, 0)}
                  onMoveRight={() => movePiece(1, 0)}
                  onRotate={rotate}
                  onSoftDrop={softDrop}
                  onHardDrop={hardDrop}
                  onTogglePause={togglePause}
                  isPaused={state.isPaused}
                  disabled={state.gameOver || !state.isPlaying}
                />
              </div>

              {/* Center - Game Board */}
              <div className="relative order-1 lg:order-2">
                <TetrisBoard
                  board={state.board}
                  currentPiece={state.currentPiece}
                  position={state.position}
                />

                {/* Pause Overlay */}
                {state.isPaused && !state.gameOver && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-4">
                      <p className="text-xl font-bold">
                        {t("games.tetris.paused", { defaultValue: "PAUSED" })}
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button onClick={togglePause}>
                          <Play className="w-4 h-4 mr-2" />
                          {t("games.tetris.resume", { defaultValue: "Resume" })}
                        </Button>
                        <Button variant="outline" onClick={() => handleStartGame(gameMode!)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {t("games.tetris.restart", { defaultValue: "Restart" })}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Not Playing Overlay (game stopped unexpectedly) */}
                {!state.isPlaying && !state.gameOver && !state.isPaused && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-4">
                      <p className="text-lg font-medium text-muted-foreground">
                        {t("games.tetris.gameStopped", { defaultValue: "Game Stopped" })}
                      </p>
                      <Button onClick={() => handleStartGame(gameMode!)}>
                        <Play className="w-4 h-4 mr-2" />
                        {t("games.tetris.startNew", { defaultValue: "Start New Game" })}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Game Over Overlay */}
                {state.gameOver && (
                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center space-y-4">
                      <p className="text-2xl font-bold text-destructive">
                        {t("games.tetris.gameOver", { defaultValue: "GAME OVER" })}
                      </p>
                      {gameMode === "ai" && (
                        <div className="space-y-2">
                          <p className="text-lg">
                            {t("games.tetris.yourScore", { defaultValue: "Your Score" })}: <span className="font-bold">{state.score.toLocaleString()}</span>
                          </p>
                          <p className="text-lg">
                            {t("games.tetris.aiScore", { defaultValue: "AI Score" })}: <span className="font-bold">{aiScore.toLocaleString()}</span>
                          </p>
                          <p className={`text-xl font-bold ${state.score > aiScore ? "text-green-500" : "text-destructive"}`}>
                            {state.score > aiScore
                              ? t("games.tetris.youWin", { defaultValue: "YOU WIN!" })
                              : t("games.tetris.aiWins", { defaultValue: "AI WINS!" })}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => handleStartGame(gameMode!)} className="gap-2">
                          <RotateCcw className="w-4 h-4" />
                          {t("games.tetris.playAgain", { defaultValue: "Play Again" })}
                        </Button>
                        <Button variant="outline" onClick={handleCloseLightbox}>
                          {t("common.close", { defaultValue: "Close" })}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel - Score */}
              <div className="flex flex-col gap-4 w-full lg:w-56 order-3">
                {/* Score Display */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {t("games.tetris.score", { defaultValue: "Score" })}
                      </p>
                      <p className="text-3xl font-bold font-mono">{state.score.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t("games.tetris.level", { defaultValue: "Level" })}
                        </p>
                        <p className="text-xl font-bold">{state.level}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t("games.tetris.lines", { defaultValue: "Lines" })}
                        </p>
                        <p className="text-xl font-bold">{state.linesCleared}</p>
                      </div>
                    </div>
                    {gameMode === "ai" && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {t("games.tetris.aiTarget", { defaultValue: "AI Target" })}
                        </p>
                        <p className="text-xl font-bold text-orange-500">{aiScore.toLocaleString()}</p>
                      </div>
                    )}
                    {/* Restart Button */}
                    {state.isPlaying && !state.gameOver && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => handleStartGame(gameMode!)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("games.tetris.restart", { defaultValue: "Restart" })}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};