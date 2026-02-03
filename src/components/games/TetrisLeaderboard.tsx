import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  score: number;
  level: number;
  lines_cleared: number;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const TetrisLeaderboard = () => {
  const { t } = useTranslation();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["tetris-leaderboard"],
    queryFn: async () => {
      // Get top 10 high scores
      const { data: scores, error } = await supabase
        .from("tetris_high_scores")
        .select("user_id, score, level, lines_cleared, created_at")
        .order("score", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(scores?.map((s) => s.user_id) || [])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return (scores || []).map((score) => ({
        ...score,
        profile: profileMap.get(score.user_id),
      })) as LeaderboardEntry[];
    },
    staleTime: 60000, // 1 minute
  });

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {t("games.tetris.leaderboard", { defaultValue: "Leaderboard" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {t("games.tetris.leaderboard", { defaultValue: "Leaderboard" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("games.tetris.noScores", { defaultValue: "No scores yet. Be the first!" })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          {t("games.tetris.leaderboard", { defaultValue: "Leaderboard" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaderboard.map((entry, index) => (
          <div
            key={`${entry.user_id}-${entry.created_at}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`w-6 text-center font-bold ${getMedalColor(index)}`}>
              {index < 3 ? <Medal className="w-5 h-5 mx-auto" /> : index + 1}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage src={entry.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {(entry.profile?.display_name || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {entry.profile?.display_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                Lvl {entry.level} · {entry.lines_cleared} lines
              </p>
            </div>
            <p className="font-bold text-sm">{entry.score.toLocaleString()}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
