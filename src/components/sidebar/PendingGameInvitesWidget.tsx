import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Gamepad2, Grid3X3, LayoutGrid, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PendingGameInvite {
  id: string;
  gameType: "tictactoe" | "memory" | "sudoku";
  inviterId: string;
  inviterName: string | null;
  inviterAvatar: string | null;
  difficulty?: string;
  createdAt: string;
}

export const PendingGameInvitesWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<PendingGameInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPendingInvites = async () => {
      try {
        const invites: PendingGameInvite[] = [];

        // Fetch pending Tic-Tac-Toe games where user is the invited player (player_o)
        const { data: ticTacToeGames } = await supabase
          .from("tic_tac_toe_games")
          .select("id, player_x, created_at")
          .eq("player_o", user.id)
          .eq("status", "pending");

        // Fetch pending Memory Match games where user is the invited player (player_2)
        const { data: memoryGames } = await supabase
          .from("memory_match_games")
          .select("id, player_1, difficulty, created_at")
          .eq("player_2", user.id)
          .eq("status", "pending");

        // Fetch pending Sudoku multiplayer games where user is the invited player (player_2)
        const { data: sudokuGames } = await supabase
          .from("sudoku_games")
          .select("id, player_1, difficulty, created_at")
          .eq("player_2", user.id)
          .eq("status", "pending")
          .eq("is_multiplayer", true);

        // Collect all inviter IDs
        const inviterIds: string[] = [];
        if (ticTacToeGames) {
          ticTacToeGames.forEach(g => inviterIds.push(g.player_x));
        }
        if (memoryGames) {
          memoryGames.forEach(g => inviterIds.push(g.player_1));
        }
        if (sudokuGames) {
          sudokuGames.forEach(g => inviterIds.push(g.player_1));
        }

        // Fetch profiles for all inviters
        let profiles: any[] = [];
        if (inviterIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", [...new Set(inviterIds)]);
          profiles = profilesData || [];
        }

        // Map Tic-Tac-Toe invites
        if (ticTacToeGames) {
          ticTacToeGames.forEach(game => {
            const profile = profiles.find(p => p.user_id === game.player_x);
            invites.push({
              id: game.id,
              gameType: "tictactoe",
              inviterId: game.player_x,
              inviterName: profile?.display_name || null,
              inviterAvatar: profile?.avatar_url || null,
              createdAt: game.created_at,
            });
          });
        }

        // Map Memory Match invites
        if (memoryGames) {
          memoryGames.forEach(game => {
            const profile = profiles.find(p => p.user_id === game.player_1);
            invites.push({
              id: game.id,
              gameType: "memory",
              inviterId: game.player_1,
              inviterName: profile?.display_name || null,
              inviterAvatar: profile?.avatar_url || null,
              difficulty: game.difficulty,
              createdAt: game.created_at,
            });
          });
        }

        // Map Sudoku invites
        if (sudokuGames) {
          sudokuGames.forEach(game => {
            const profile = profiles.find(p => p.user_id === game.player_1);
            invites.push({
              id: game.id,
              gameType: "sudoku",
              inviterId: game.player_1,
              inviterName: profile?.display_name || null,
              inviterAvatar: profile?.avatar_url || null,
              difficulty: game.difficulty,
              createdAt: game.created_at,
            });
          });
        }

        // Sort by created_at descending (newest first)
        invites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPendingInvites(invites);
      } catch (error) {
        console.error("Error fetching pending invites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingInvites();

    // Subscribe to realtime updates for all game tables
    const channels = [
      supabase
        .channel("pending-tictactoe-invites")
        .on("postgres_changes", { event: "*", schema: "public", table: "tic_tac_toe_games" }, fetchPendingInvites)
        .subscribe(),
      supabase
        .channel("pending-memory-invites")
        .on("postgres_changes", { event: "*", schema: "public", table: "memory_match_games" }, fetchPendingInvites)
        .subscribe(),
      supabase
        .channel("pending-sudoku-invites")
        .on("postgres_changes", { event: "*", schema: "public", table: "sudoku_games" }, fetchPendingInvites)
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  const handleAccept = async (invite: PendingGameInvite) => {
    setProcessingId(invite.id);
    try {
      let navigateParam = "";
      let error = null;
      
      switch (invite.gameType) {
        case "tictactoe":
          navigateParam = `game=${invite.id}`;
          ({ error } = await supabase
            .from("tic_tac_toe_games")
            .update({ status: "active" })
            .eq("id", invite.id));
          break;
        case "memory":
          navigateParam = `memory=${invite.id}`;
          ({ error } = await supabase
            .from("memory_match_games")
            .update({ status: "active" })
            .eq("id", invite.id));
          break;
        case "sudoku":
          navigateParam = `sudoku=${invite.id}`;
          ({ error } = await supabase
            .from("sudoku_games")
            .update({ status: "active" })
            .eq("id", invite.id));
          break;
      }

      if (error) throw error;

      toast.success(t("games.inviteAccepted", { defaultValue: "Game started!" }));
      navigate(`/games?${navigateParam}`);
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error(t("games.acceptError", { defaultValue: "Failed to accept invite" }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite: PendingGameInvite) => {
    setProcessingId(invite.id);
    try {
      let error = null;
      
      switch (invite.gameType) {
        case "tictactoe":
          ({ error } = await supabase
            .from("tic_tac_toe_games")
            .update({ status: "declined" })
            .eq("id", invite.id));
          break;
        case "memory":
          ({ error } = await supabase
            .from("memory_match_games")
            .update({ status: "declined" })
            .eq("id", invite.id));
          break;
        case "sudoku":
          ({ error } = await supabase
            .from("sudoku_games")
            .update({ status: "declined" })
            .eq("id", invite.id));
          break;
      }

      if (error) throw error;

      toast.success(t("games.inviteDeclined", { defaultValue: "Invite declined" }));
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (error) {
      console.error("Error declining invite:", error);
      toast.error(t("games.declineError", { defaultValue: "Failed to decline invite" }));
    } finally {
      setProcessingId(null);
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case "tictactoe":
        return <Gamepad2 className="h-4 w-4 text-primary" />;
      case "memory":
        return <LayoutGrid className="h-4 w-4 text-purple-500" />;
      case "sudoku":
        return <Grid3X3 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Gamepad2 className="h-4 w-4 text-primary" />;
    }
  };

  const getGameName = (gameType: string) => {
    switch (gameType) {
      case "tictactoe":
        return t("games.ticTacToe", { defaultValue: "Tic-Tac-Toe" });
      case "memory":
        return t("games.memoryMatch", { defaultValue: "Memory Match" });
      case "sudoku":
        return t("games.sudoku", { defaultValue: "Sudoku" });
      default:
        return "Game";
    }
  };

  const getGameColor = (gameType: string) => {
    switch (gameType) {
      case "tictactoe":
        return "from-primary to-primary/70";
      case "memory":
        return "from-purple-500 to-purple-600";
      case "sudoku":
        return "from-emerald-500 to-teal-600";
      default:
        return "from-primary to-primary/70";
    }
  };

  if (loading || pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl p-4 mb-4 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-green-500/20">
          <Gamepad2 className="h-4 w-4 text-green-500" />
        </div>
        <h3 className="font-semibold text-foreground">
          {t("sidebar.gameInvites", { defaultValue: "Game Invites" })}
        </h3>
        <span className="ml-auto text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full animate-pulse">
          {pendingInvites.length}
        </span>
      </div>
      <hr className="border-border my-3" />

      <div className="space-y-3">
        {pendingInvites.map((invite) => (
          <div
            key={`${invite.gameType}-${invite.id}`}
            className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-green-500/30">
                <AvatarImage src={invite.inviterAvatar || undefined} />
                <AvatarFallback className={cn("bg-gradient-to-br text-white text-xs", getGameColor(invite.gameType))}>
                  {invite.inviterName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getGameIcon(invite.gameType)}
                  <span className="text-sm font-medium text-foreground truncate">
                    {invite.inviterName || t("common.someone", { defaultValue: "Someone" })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{getGameName(invite.gameType)}</span>
                  {invite.difficulty && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{invite.difficulty}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAccept(invite)}
                disabled={processingId === invite.id}
              >
                <Check className="h-3.5 w-3.5" />
                {t("games.accept", { defaultValue: "Accept" })}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={() => handleDecline(invite)}
                disabled={processingId === invite.id}
              >
                <X className="h-3.5 w-3.5" />
                {t("games.decline", { defaultValue: "Decline" })}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
