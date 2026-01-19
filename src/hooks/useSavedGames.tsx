import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SavedSudokuGame {
  id: string;
  difficulty: string;
  player_1_time: number | null;
  updated_at: string;
}

export const useSavedGames = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const deleteSavedGame = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase
        .from("sudoku_games")
        .delete()
        .eq("id", gameId)
        .eq("player_1", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-sudoku-games", user?.id] });
    },
    onError: (error) => {
      console.error("Error deleting saved game:", error);
      toast.error("Failed to delete game");
    },
  });

  return { 
    savedSudokuGames, 
    refetchSavedGames: refetch,
    deleteSavedGame: deleteSavedGame.mutate,
    isDeletingGame: deleteSavedGame.isPending,
  };
};
