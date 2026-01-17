import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const useGameNotifications = () => {
  const { user } = useAuth();

  const { data: pendingTurnCount = 0, refetch } = useQuery({
    queryKey: ["game-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Fetch Tic Tac Toe games where it's the current user's turn
      const { data: ticTacToeGames, error: ticTacToeError } = await supabase
        .from("tic_tac_toe_games")
        .select("id, player_x, player_o, current_turn, status")
        .or(`player_x.eq.${user.id},player_o.eq.${user.id}`)
        .eq("status", "active");

      if (ticTacToeError) {
        console.error("Error fetching tic tac toe notifications:", ticTacToeError);
      }

      // Fetch Memory Match games where it's the current user's turn
      const { data: memoryGames, error: memoryError } = await supabase
        .from("memory_match_games")
        .select("id, player_1, player_2, current_turn, status")
        .or(`player_1.eq.${user.id},player_2.eq.${user.id}`)
        .eq("status", "active");

      if (memoryError) {
        console.error("Error fetching memory match notifications:", memoryError);
      }

      // Count Tic Tac Toe games where it's the user's turn
      const ticTacToeCount = (ticTacToeGames || []).filter((game) => {
        const isPlayerX = game.player_x === user.id;
        const isPlayerO = game.player_o === user.id;
        const isMyTurn =
          (isPlayerX && game.current_turn === "x") ||
          (isPlayerO && game.current_turn === "o");
        return isMyTurn;
      }).length;

      // Count Memory Match games where it's the user's turn
      const memoryCount = (memoryGames || []).filter((game) => {
        return game.current_turn === user.id;
      }).length;

      return ticTacToeCount + memoryCount;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const ticTacToeChannel = supabase
      .channel("tictactoe-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tic_tac_toe_games",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    const memoryChannel = supabase
      .channel("memory-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memory_match_games",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticTacToeChannel);
      supabase.removeChannel(memoryChannel);
    };
  }, [user?.id, refetch]);

  return { pendingTurnCount };
};
