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

      // Fetch games where it's the current user's turn
      const { data, error } = await supabase
        .from("tic_tac_toe_games")
        .select("id, player_x, player_o, current_turn, status")
        .or(`player_x.eq.${user.id},player_o.eq.${user.id}`)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching game notifications:", error);
        return 0;
      }

      // Count games where it's the user's turn
      const count = data.filter((game) => {
        const isPlayerX = game.player_x === user.id;
        const isPlayerO = game.player_o === user.id;
        const isMyTurn =
          (isPlayerX && game.current_turn === "x") ||
          (isPlayerO && game.current_turn === "o");
        return isMyTurn;
      }).length;

      return count;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("game-notifications")
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return { pendingTurnCount };
};
