import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MemoryMatchStatsProps {
  wins: number;
  losses: number;
  draws: number;
}

export const MemoryMatchStats = ({ wins, losses, draws }: MemoryMatchStatsProps) => {
  const { t } = useTranslation();
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <Trophy className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{wins}</p>
            <p className="text-xs text-muted-foreground">{t("games.wins", { defaultValue: "Wins" })}</p>
          </div>
          <div>
            <Target className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{losses}</p>
            <p className="text-xs text-muted-foreground">{t("games.losses", { defaultValue: "Losses" })}</p>
          </div>
          <div>
            <div className="w-5 h-5 mx-auto mb-1 text-yellow-500 font-bold">=</div>
            <p className="text-2xl font-bold text-yellow-600">{draws}</p>
            <p className="text-xs text-muted-foreground">{t("games.draws", { defaultValue: "Draws" })}</p>
          </div>
          <div>
            <Percent className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{winRate}%</p>
            <p className="text-xs text-muted-foreground">{t("games.winRate", { defaultValue: "Win Rate" })}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
