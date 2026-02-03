import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, Hash, Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TetrisStatsProps {
  stats: {
    games_played: number;
    best_score: number;
    best_level: number;
    total_lines_cleared: number;
    ai_wins: number;
    ai_losses: number;
  } | null;
}

export const TetrisStats = ({ stats }: TetrisStatsProps) => {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            {t("games.tetris.noStats", { defaultValue: "Play your first game to see stats!" })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("games.tetris.bestScore", { defaultValue: "Best Score" })}
              </p>
              <p className="font-bold">{stats.best_score.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("games.tetris.bestLevel", { defaultValue: "Best Level" })}
              </p>
              <p className="font-bold">{stats.best_level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Hash className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("games.tetris.totalLines", { defaultValue: "Total Lines" })}
              </p>
              <p className="font-bold">{stats.total_lines_cleared.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Gamepad2 className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("games.tetris.aiRecord", { defaultValue: "vs AI" })}
              </p>
              <p className="font-bold">{stats.ai_wins}W - {stats.ai_losses}L</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
