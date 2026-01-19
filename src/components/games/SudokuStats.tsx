import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Clock, Target, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SudokuStatsProps {
  stats: {
    easy_best_time: number | null;
    medium_best_time: number | null;
    hard_best_time: number | null;
    expert_best_time: number | null;
    easy_games_won: number;
    medium_games_won: number;
    hard_games_won: number;
    expert_games_won: number;
    total_games_played: number;
    multiplayer_wins: number;
    multiplayer_losses: number;
  } | null;
}

export const SudokuStats = ({ stats }: SudokuStatsProps) => {
  const { t } = useTranslation();

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalWins = stats 
    ? (stats.easy_games_won || 0) + (stats.medium_games_won || 0) + 
      (stats.hard_games_won || 0) + (stats.expert_games_won || 0)
    : 0;

  return (
    <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 border-emerald-500/20">
      <CardContent className="pt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          {t("games.sudokuStats", { defaultValue: "Sudoku Stats" })}
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 rounded-lg bg-background/50">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{totalWins}</p>
            <p className="text-xs text-muted-foreground">{t("games.wins", { defaultValue: "Wins" })}</p>
          </div>
          
          <div className="p-2 rounded-lg bg-background/50">
            <Target className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{stats?.total_games_played || 0}</p>
            <p className="text-xs text-muted-foreground">{t("games.played", { defaultValue: "Played" })}</p>
          </div>
          
          <div className="p-2 rounded-lg bg-background/50">
            <Users className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{stats?.multiplayer_wins || 0}</p>
            <p className="text-xs text-muted-foreground">{t("games.mpWins", { defaultValue: "MP Wins" })}</p>
          </div>
          
          <div className="p-2 rounded-lg bg-background/50">
            <Clock className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold">{formatTime(stats?.easy_best_time || null)}</p>
            <p className="text-xs text-muted-foreground">{t("games.easyBest", { defaultValue: "Easy Best" })}</p>
          </div>
        </div>
        
        {/* Best times by difficulty */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">{t("games.bestTimes", { defaultValue: "Best Times" })}</p>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="font-medium">{formatTime(stats?.easy_best_time || null)}</p>
              <p className="text-muted-foreground">Easy</p>
            </div>
            <div>
              <p className="font-medium">{formatTime(stats?.medium_best_time || null)}</p>
              <p className="text-muted-foreground">Medium</p>
            </div>
            <div>
              <p className="font-medium">{formatTime(stats?.hard_best_time || null)}</p>
              <p className="text-muted-foreground">Hard</p>
            </div>
            <div>
              <p className="font-medium">{formatTime(stats?.expert_best_time || null)}</p>
              <p className="text-muted-foreground">Expert</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
