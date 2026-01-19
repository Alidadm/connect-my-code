import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, Loader2, Play, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SavedGame {
  id: string;
  difficulty: string;
  player_1_time: number | null;
  updated_at: string;
}

interface SudokuDifficultySelectorProps {
  onSelectDifficulty: (difficulty: string, isMultiplayer: boolean) => void;
  onResumeSavedGame?: (gameId: string) => void;
  loading: boolean;
  savedGames?: SavedGame[];
}

const difficulties = [
  { id: 'easy', label: 'Easy', description: '35-40 clues', color: 'text-green-500 border-green-500/30' },
  { id: 'medium', label: 'Medium', description: '30-34 clues', color: 'text-yellow-500 border-yellow-500/30' },
  { id: 'hard', label: 'Hard', description: '25-29 clues', color: 'text-orange-500 border-orange-500/30' },
  { id: 'expert', label: 'Expert', description: '20-24 clues', color: 'text-red-500 border-red-500/30' },
];

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const SudokuDifficultySelector = ({ 
  onSelectDifficulty, 
  onResumeSavedGame,
  loading,
  savedGames = []
}: SudokuDifficultySelectorProps) => {
  const { t } = useTranslation();

  const getSavedGameForDifficulty = (difficultyId: string) => {
    return savedGames.find(g => g.difficulty === difficultyId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("games.selectDifficulty", { defaultValue: "Select Difficulty" })}</CardTitle>
        <CardDescription>
          {t("games.chooseDifficulty", { defaultValue: "Choose your challenge level" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {difficulties.map((diff) => {
            const savedGame = getSavedGameForDifficulty(diff.id);
            
            return (
              <div 
                key={diff.id}
                className={cn(
                  "p-4 rounded-lg border-2 text-center space-y-3",
                  diff.color,
                  "bg-card hover:bg-accent/50 transition-colors"
                )}
              >
                <div>
                  <Badge variant="outline" className={diff.color}>
                    {diff.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{diff.description}</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {savedGame && onResumeSavedGame ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onResumeSavedGame(savedGame.id)}
                        disabled={loading}
                        className="w-full gap-1"
                      >
                        {loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {t("games.continueSaved", { defaultValue: "Continue" })}
                      </Button>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {savedGame.player_1_time ? formatTime(savedGame.player_1_time) : '00:00'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectDifficulty(diff.id, false)}
                        disabled={loading}
                        className="w-full gap-1 text-xs"
                      >
                        <User className="w-3 h-3" />
                        {t("games.newGame", { defaultValue: "New Game" })}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onSelectDifficulty(diff.id, false)}
                      disabled={loading}
                      className="w-full gap-1"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {t("games.singlePlayer", { defaultValue: "Single Player" })}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectDifficulty(diff.id, true)}
                    disabled={loading}
                    className="w-full gap-1"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {t("games.inviteFriend", { defaultValue: "Invite Friend" })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
