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
import { MemoryMatchGame } from "@/components/games/MemoryMatchGame";
import { InviteFriendToGameDialog } from "@/components/games/InviteFriendToGameDialog";
import { InviteFriendToMemoryDialog } from "@/components/games/InviteFriendToMemoryDialog";
import { GameStats } from "@/components/games/GameStats";
import { MemoryMatchStats } from "@/components/games/MemoryMatchStats";
import { Gamepad2, Plus, Clock, Trophy, Users, Loader2, History, Grid3X3, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

interface TicTacToeGameWithPlayers {
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

interface MemoryGameWithPlayers {
  id: string;
  player_1: string;
  player_2: string | null;
  status: string;
  current_turn: string;
  winner: string | null;
  player_1_score: number;
  player_2_score: number;
  created_at: string;
  updated_at: string;
  player_1_profile?: { display_name: string | null; avatar_url: string | null };
  player_2_profile?: { display_name: string | null; avatar_url: string | null };
}

const Games = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Tic Tac Toe state
  const [ticTacToeGames, setTicTacToeGames] = useState<TicTacToeGameWithPlayers[]>([]);
  const [selectedTicTacToeId, setSelectedTicTacToeId] = useState<string | null>(
    searchParams.get("game") || null
  );
  const [showTicTacToeInvite, setShowTicTacToeInvite] = useState(false);
  
  // Memory Match state
  const [memoryGames, setMemoryGames] = useState<MemoryGameWithPlayers[]>([]);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(
    searchParams.get("memory") || null
  );
  const [showMemoryInvite, setShowMemoryInvite] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [activeGameType, setActiveGameType] = useState<"tictactoe" | "memory">("tictactoe");
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (user) {
      fetchAllGames();
      subscribeToGames();
    }
  }, [user]);

  const fetchAllGames = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch Tic Tac Toe games
      const { data: ticTacToe, error: ticTacToeError } = await supabase
        .from("tic_tac_toe_games")
        .select("*")
        .or(`player_x.eq.${user.id},player_o.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (ticTacToeError) throw ticTacToeError;

      // Fetch Memory Match games
      const { data: memory, error: memoryError } = await supabase
        .from("memory_match_games")
        .select("*")
        .or(`player_1.eq.${user.id},player_2.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (memoryError) throw memoryError;

      // Collect all player IDs
      const playerIds = new Set<string>();
      ticTacToe?.forEach(game => {
        playerIds.add(game.player_x);
        if (game.player_o) playerIds.add(game.player_o);
      });
      memory?.forEach(game => {
        playerIds.add(game.player_1);
        if (game.player_2) playerIds.add(game.player_2);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(playerIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Map Tic Tac Toe games with profiles
      const ticTacToeWithProfiles: TicTacToeGameWithPlayers[] = (ticTacToe || []).map(game => ({
        ...game,
        player_x_profile: profileMap.get(game.player_x),
        player_o_profile: game.player_o ? profileMap.get(game.player_o) : undefined
      }));

      // Map Memory Match games with profiles
      const memoryWithProfiles: MemoryGameWithPlayers[] = (memory || []).map(game => ({
        ...game,
        player_1_profile: profileMap.get(game.player_1),
        player_2_profile: game.player_2 ? profileMap.get(game.player_2) : undefined
      }));

      setTicTacToeGames(ticTacToeWithProfiles);
      setMemoryGames(memoryWithProfiles);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToGames = () => {
    const ticTacToeChannel = supabase
      .channel('my-tictactoe-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_tac_toe_games'
        },
        () => fetchAllGames()
      )
      .subscribe();

    const memoryChannel = supabase
      .channel('my-memory-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_match_games'
        },
        () => fetchAllGames()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticTacToeChannel);
      supabase.removeChannel(memoryChannel);
    };
  };

  // Tic Tac Toe helpers
  const getTicTacToeOpponent = (game: TicTacToeGameWithPlayers) => {
    const isPlayerX = game.player_x === user?.id;
    return isPlayerX ? game.player_o_profile : game.player_x_profile;
  };

  const isTicTacToeMyTurn = (game: TicTacToeGameWithPlayers) => {
    const isPlayerX = game.player_x === user?.id;
    return (isPlayerX && game.current_turn === 'x') || (!isPlayerX && game.current_turn === 'o');
  };

  // Memory Match helpers
  const getMemoryOpponent = (game: MemoryGameWithPlayers) => {
    const isPlayer1 = game.player_1 === user?.id;
    return isPlayer1 ? game.player_2_profile : game.player_1_profile;
  };

  const isMemoryMyTurn = (game: MemoryGameWithPlayers) => {
    return game.current_turn === user?.id;
  };

  const getStatusBadge = (game: TicTacToeGameWithPlayers | MemoryGameWithPlayers, isMyTurn: boolean) => {
    const isInvitee = 'player_o' in game 
      ? game.player_o === user?.id 
      : game.player_2 === user?.id;

    if (game.status === 'pending') {
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
      <Badge variant={isMyTurn ? "default" : "outline"}>
        <Clock className="w-3 h-3 mr-1" />
        {isMyTurn ? t("games.yourTurn", { defaultValue: "Your Turn" }) : t("games.theirTurn", { defaultValue: "Their Turn" })}
      </Badge>
    );
  };

  const filterTicTacToeGames = (status: string) => {
    switch (status) {
      case "active":
        return ticTacToeGames.filter(g => g.status === 'active' || g.status === 'pending');
      case "completed":
        return ticTacToeGames.filter(g => g.status === 'completed' || g.status === 'draw');
      case "my-turn":
        return ticTacToeGames.filter(g => g.status === 'active' && isTicTacToeMyTurn(g));
      default:
        return ticTacToeGames;
    }
  };

  const filterMemoryGames = (status: string) => {
    switch (status) {
      case "active":
        return memoryGames.filter(g => g.status === 'active' || g.status === 'pending');
      case "completed":
        return memoryGames.filter(g => g.status === 'completed' || g.status === 'draw');
      case "my-turn":
        return memoryGames.filter(g => g.status === 'active' && isMemoryMyTurn(g));
      default:
        return memoryGames;
    }
  };

  // Calculate stats
  const ticTacToeStats = useMemo(() => {
    const completedGames = ticTacToeGames.filter(g => g.status === 'completed' || g.status === 'draw');
    const wins = completedGames.filter(g => g.winner === user?.id).length;
    const losses = completedGames.filter(g => g.status === 'completed' && g.winner && g.winner !== user?.id).length;
    const draws = completedGames.filter(g => g.status === 'draw').length;
    return { wins, losses, draws };
  }, [ticTacToeGames, user?.id]);

  const memoryStats = useMemo(() => {
    const completedGames = memoryGames.filter(g => g.status === 'completed' || g.status === 'draw');
    const wins = completedGames.filter(g => g.winner === user?.id).length;
    const losses = completedGames.filter(g => g.status === 'completed' && g.winner && g.winner !== user?.id).length;
    const draws = completedGames.filter(g => g.status === 'draw').length;
    return { wins, losses, draws };
  }, [memoryGames, user?.id]);

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

  // Show active game if selected
  if (selectedTicTacToeId) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8">
          <TicTacToeGame
            gameId={selectedTicTacToeId}
            onBack={() => {
              setSelectedTicTacToeId(null);
              navigate("/games", { replace: true });
            }}
          />
        </div>
      </MainLayout>
    );
  }

  if (selectedMemoryId) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8">
          <MemoryMatchGame
            gameId={selectedMemoryId}
            onBack={() => {
              setSelectedMemoryId(null);
              navigate("/games", { replace: true });
            }}
          />
        </div>
      </MainLayout>
    );
  }

  const renderGameList = (
    games: (TicTacToeGameWithPlayers | MemoryGameWithPlayers)[],
    getOpponent: (game: any) => any,
    isMyTurn: (game: any) => boolean,
    onSelect: (id: string) => void,
    paramKey: string
  ) => (
    <>
      {games.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>{t("games.noGames", { defaultValue: "No games here yet" })}</p>
          {activeTab === "active" && (
            <Button
              variant="link"
              onClick={() => activeGameType === "tictactoe" ? setShowTicTacToeInvite(true) : setShowMemoryInvite(true)}
              className="mt-2"
            >
              {t("games.startFirst", { defaultValue: "Start your first game!" })}
            </Button>
          )}
        </div>
      ) : (
        games.map((game) => {
          const opponent = getOpponent(game);
          return (
            <button
              key={game.id}
              onClick={() => {
                onSelect(game.id);
                navigate(`/games?${paramKey}=${game.id}`, { replace: true });
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
              {getStatusBadge(game, isMyTurn(game))}
            </button>
          );
        })
      )}
    </>
  );

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
        </div>

        {/* Game Type Selector */}
        <div className="flex gap-2">
          <Button
            variant={activeGameType === "tictactoe" ? "default" : "outline"}
            onClick={() => setActiveGameType("tictactoe")}
            className="gap-2"
          >
            <Grid3X3 className="w-4 h-4" />
            {t("games.ticTacToe", { defaultValue: "Tic-Tac-Toe" })}
          </Button>
          <Button
            variant={activeGameType === "memory" ? "default" : "outline"}
            onClick={() => setActiveGameType("memory")}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            {t("games.memoryMatch", { defaultValue: "Memory Match" })}
          </Button>
        </div>

        {/* Stats Card */}
        {activeGameType === "tictactoe" ? (
          <GameStats wins={ticTacToeStats.wins} losses={ticTacToeStats.losses} draws={ticTacToeStats.draws} />
        ) : (
          <MemoryMatchStats wins={memoryStats.wins} losses={memoryStats.losses} draws={memoryStats.draws} />
        )}

        {/* Game Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeGameType === "tictactoe" ? (
                    <>
                      <Grid3X3 className="w-5 h-5" />
                      {t("games.ticTacToe", { defaultValue: "Tic-Tac-Toe" })}
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-5 h-5" />
                      {t("games.memoryMatch", { defaultValue: "Memory Match" })}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {activeGameType === "tictactoe" 
                    ? t("games.ticTacToeDesc", { defaultValue: "Classic game - take turns with friends, even when offline!" })
                    : t("games.memoryMatchDesc", { defaultValue: "Find matching pairs - challenge your friends' memory!" })
                  }
                </CardDescription>
              </div>
              <Button 
                onClick={() => activeGameType === "tictactoe" ? setShowTicTacToeInvite(true) : setShowMemoryInvite(true)} 
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("games.newGame", { defaultValue: "New Game" })}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  {t("games.activeGames", { defaultValue: "Active" })}
                  {(activeGameType === "tictactoe" ? filterTicTacToeGames("active") : filterMemoryGames("active")).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {(activeGameType === "tictactoe" ? filterTicTacToeGames("active") : filterMemoryGames("active")).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="my-turn">
                  {t("games.myTurn", { defaultValue: "My Turn" })}
                  {(activeGameType === "tictactoe" ? filterTicTacToeGames("my-turn") : filterMemoryGames("my-turn")).length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {(activeGameType === "tictactoe" ? filterTicTacToeGames("my-turn") : filterMemoryGames("my-turn")).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1">
                  <History className="w-4 h-4" />
                  {t("games.history", { defaultValue: "History" })}
                  {(activeGameType === "tictactoe" ? filterTicTacToeGames("completed") : filterMemoryGames("completed")).length > 0 && (
                    <Badge variant="outline" className="ml-1">
                      {(activeGameType === "tictactoe" ? filterTicTacToeGames("completed") : filterMemoryGames("completed")).length}
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
                      {activeGameType === "tictactoe" 
                        ? renderGameList(
                            filterTicTacToeGames(tab),
                            getTicTacToeOpponent,
                            isTicTacToeMyTurn,
                            setSelectedTicTacToeId,
                            "game"
                          )
                        : renderGameList(
                            filterMemoryGames(tab),
                            getMemoryOpponent,
                            isMemoryMyTurn,
                            setSelectedMemoryId,
                            "memory"
                          )
                      }
                    </TabsContent>
                  ))}
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <InviteFriendToGameDialog
        open={showTicTacToeInvite}
        onOpenChange={setShowTicTacToeInvite}
        onGameCreated={(gameId) => {
          setSelectedTicTacToeId(gameId);
          navigate(`/games?game=${gameId}`, { replace: true });
        }}
      />

      <InviteFriendToMemoryDialog
        open={showMemoryInvite}
        onOpenChange={setShowMemoryInvite}
        onGameCreated={(gameId) => {
          setSelectedMemoryId(gameId);
          navigate(`/games?memory=${gameId}`, { replace: true });
        }}
      />
    </MainLayout>
  );
};

export default Games;
