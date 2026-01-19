import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SavedSudokuGame {
  id: string;
  difficulty: string;
  player_1_time: number | null;
  updated_at: string;
}

export const useSavedGames = () => {
  const { user } = useAuth();

  const { data: savedSudokuGames = [], refetch } = useQuery({
    queryKey: ["saved-sudoku-games", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("sudoku_games")
        .select("id, difficulty, player_1_time, updated_at")
        .eq("player_1", user.id)
        .eq("is_multiplayer", false)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching saved sudoku games:", error);
        return [];
      }

      return data as SavedSudokuGame[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  return { savedSudokuGames, refetchSavedGames: refetch };
};
