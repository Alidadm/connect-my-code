import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicTacToeGame } from "@/components/games/TicTacToeGame";
import { InviteFriendToGameDialog } from "@/components/games/InviteFriendToGameDialog";
import { GameStats } from "@/components/games/GameStats";
import { Gamepad2, Plus, Clock, Trophy, Users, Loader2, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

interface GameWithPlayers {
  id: string;
  player_x: string;
  player_o: string | null;
  status: string;
  current_turn: string;
  winner: string | null;
  created_at: string;
  updated_at: string;
  player_x_profile?: { display_name: string | null; avatar_url: string | null };
  player_o_profile?: { display_name: string | null; avatar_url: string | null };
}

const Games = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<GameWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    searchParams.get("game") || null
  );
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (user) {
      fetchGames();
      subscribeToGames();
    }
  }, [user]);

  const fetchGames = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("tic_tac_toe_games")
        .select("*")
        .or(`player_x.eq.${user.id},player_o.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all players
      const playerIds = new Set<string>();
      data?.forEach(game => {
        playerIds.add(game.player_x);
        if (game.player_o) playerIds.add(game.player_o);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(playerIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const gamesWithProfiles: GameWithPlayers[] = (data || []).map(game => ({
        ...game,
        player_x_profile: profileMap.get(game.player_x),
        player_o_profile: game.player_o ? profileMap.get(game.player_o) : undefined
      }));

      setGames(gamesWithProfiles);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToGames = () => {
    const channel = supabase
      .channel('my-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_tac_toe_games'
        },
        () => {
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getOpponent = (game: GameWithPlayers) => {
    const isPlayerX = game.player_x === user?.id;
    return isPlayerX ? game.player_o_profile : game.player_x_profile;
  };

  const isMyTurn = (game: GameWithPlayers) => {
    const isPlayerX = game.player_x === user?.id;
    return (isPlayerX && game.current_turn === 'x') || (!isPlayerX && game.current_turn === 'o');
  };

  const getStatusBadge = (game: GameWithPlayers) => {
    if (game.status === 'pending') {
      const isInvitee = game.player_o === user?.id;
      return (
        <Badge variant="secondary">
          {isInvitee ? t("games.invitePending", { defaultValue: "Invite Pending" }) : t("games.waiting", { defaultValue: "Waiting..." })}
        </Badge>
      );
    }
    if (game.status === 'completed') {
      return (
        <Badge variant={game.winner === user?.id ? "default" : "destructive"}>
          <Trophy className="w-3 h-3 mr-1" />
          {game.winner === user?.id ? t("games.won", { defaultValue: "Won" }) : t("games.lost", { defaultValue: "Lost" })}
        </Badge>
      );
    }
    if (game.status === 'draw') {
      return <Badge variant="secondary">{t("games.draw", { defaultValue: "Draw" })}</Badge>;
    }
    if (game.status === 'declined') {
      return <Badge variant="outline">{t("games.declined", { defaultValue: "Declined" })}</Badge>;
    }
    return (
      <Badge variant={isMyTurn(game) ? "default" : "outline"}>
        <Clock className="w-3 h-3 mr-1" />
        {isMyTurn(game) ? t("games.yourTurn", { defaultValue: "Your Turn" }) : t("games.theirTurn", { defaultValue: "Their Turn" })}
      </Badge>
    );
  };

  const filterGames = (status: string) => {
    switch (status) {
      case "active":
        return games.filter(g => g.status === 'active' || g.status === 'pending');
      case "completed":
        return games.filter(g => g.status === 'completed' || g.status === 'draw');
      case "my-turn":
        return games.filter(g => g.status === 'active' && isMyTurn(g));
      default:
        return games;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const completedGames = games.filter(g => g.status === 'completed' || g.status === 'draw');
    const wins = completedGames.filter(g => g.winner === user?.id).length;
    const losses = completedGames.filter(g => g.status === 'completed' && g.winner && g.winner !== user?.id).length;
    const draws = completedGames.filter(g => g.status === 'draw').length;
    return { wins, losses, draws };
  }, [games, user?.id]);

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t("games.loginToPlay", { defaultValue: "Log in to play games with friends!" })}
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (selectedGameId) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8">
          <TicTacToeGame
            gameId={selectedGameId}
            onBack={() => {
              setSelectedGameId(null);
              navigate("/games", { replace: true });
            }}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6" />
              {t("games.title", { defaultValue: "Games" })}
            </h1>
            <p className="text-muted-foreground">
              {t("games.subtitle", { defaultValue: "Play games with your friends!" })}
            </p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("games.newGame", { defaultValue: "New Game" })}
          </Button>
        </div>

        {/* Stats Card */}
        <GameStats wins={stats.wins} losses={stats.losses} draws={stats.draws} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("games.ticTacToe", { defaultValue: "Tic-Tac-Toe" })}
            </CardTitle>
            <CardDescription>
              {t("games.ticTacToeDesc", { defaultValue: "Classic game - take turns with friends, even when offline!" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  {t("games.activeGames", { defaultValue: "Active" })}
                  {filterGames("active").length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filterGames("active").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="my-turn">
                  {t("games.myTurn", { defaultValue: "My Turn" })}
                  {filterGames("my-turn").length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {filterGames("my-turn").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1">
                  <History className="w-4 h-4" />
                  {t("games.history", { defaultValue: "History" })}
                  {filterGames("completed").length > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {filterGames("completed").length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {["active", "my-turn", "completed"].map((tab) => (
                    <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
                      {filterGames(tab).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{t("games.noGames", { defaultValue: "No games here yet" })}</p>
                          {tab === "active" && (
                            <Button
                              variant="link"
                              onClick={() => setShowInviteDialog(true)}
                              className="mt-2"
                            >
                              {t("games.startFirst", { defaultValue: "Start your first game!" })}
                            </Button>
                          )}
                        </div>
                      ) : (
                        filterGames(tab).map((game) => {
                          const opponent = getOpponent(game);
                          return (
                            <button
                              key={game.id}
                              onClick={() => {
                                setSelectedGameId(game.id);
                                navigate(`/games?game=${game.id}`, { replace: true });
                              }}
                              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={opponent?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {(opponent?.display_name || "?")[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {t("games.vsPlayer", { 
                                      defaultValue: "vs {{name}}", 
                                      name: opponent?.display_name || "Unknown" 
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(game.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(game)}
                            </button>
                          );
                        })
                      )}
                    </TabsContent>
                  ))}
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <InviteFriendToGameDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onGameCreated={(gameId) => {
          setSelectedGameId(gameId);
          navigate(`/games?game=${gameId}`, { replace: true });
        }}
      />
    </MainLayout>
  );
};

export default Games;
