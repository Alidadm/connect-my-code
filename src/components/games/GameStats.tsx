import { Card, CardContent } from "@/components/ui/card";
import { Trophy, XCircle, Minus, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GameStatsProps {
  wins: number;
  losses: number;
  draws: number;
}

export const GameStats = ({ wins, losses, draws }: GameStatsProps) => {
  const { t } = useTranslation();
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{wins}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("games.stats.wins", { defaultValue: "Wins" })}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{losses}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("games.stats.losses", { defaultValue: "Losses" })}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Minus className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-muted-foreground">{draws}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("games.stats.draws", { defaultValue: "Draws" })}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Percent className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{winRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("games.stats.winRate", { defaultValue: "Win Rate" })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
