import { Search, MoreVertical, Bell, Cake, TrendingUp, MessageCircle, Heart, Users, Circle, Send, PenLine, Settings2, Check, CalendarClock, Gamepad2, Play, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format, isToday, isTomorrow, addDays, isSameDay, differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleBirthdayWishDialog } from "@/components/birthday/ScheduleBirthdayWishDialog";

interface MessageWithSender {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_id: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface OnlineFriend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  isOnline: boolean;
}

interface BirthdayReminder {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  birthday: Date;
  isToday: boolean;
  isTomorrow: boolean;
  daysUntil: number;
}

const BIRTHDAY_REMINDER_OPTIONS = [
  { value: 0, label: "sidebar.birthdayReminder.sameDay", fallback: "Same day only" },
  { value: 1, label: "sidebar.birthdayReminder.1day", fallback: "1 day before" },
  { value: 3, label: "sidebar.birthdayReminder.3days", fallback: "3 days before" },
  { value: 7, label: "sidebar.birthdayReminder.7days", fallback: "7 days before" },
  { value: 14, label: "sidebar.birthdayReminder.14days", fallback: "14 days before" },
  { value: 30, label: "sidebar.birthdayReminder.30days", fallback: "30 days before" },
];

interface TrendingPost {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  author: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ActiveTicTacToeGame {
  id: string;
  player_x: string;
  player_o: string | null;
  current_turn: string;
  status: string;
  opponent?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  isMyTurn: boolean;
}


export const RightSidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"notification" | "unread">("notification");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayReminder[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveTicTacToeGame[]>([]);
  
  // Birthday reminder settings - stored in localStorage
  const [birthdayReminderDays, setBirthdayReminderDays] = useState<number>(() => {
    const saved = localStorage.getItem("birthdayReminderDays");
    return saved ? parseInt(saved, 10) : 7; // Default to 7 days
  });
  
  // Schedule wish dialog state
  const [scheduleWishDialogOpen, setScheduleWishDialogOpen] = useState(false);
  const [selectedFriendForWish, setSelectedFriendForWish] = useState<BirthdayReminder | null>(null);
  
  const handleReminderDaysChange = (days: number) => {
    setBirthdayReminderDays(days);
    localStorage.setItem("birthdayReminderDays", days.toString());
  };
  
  const handleScheduleWish = (friend: BirthdayReminder) => {
    setSelectedFriendForWish(friend);
    setScheduleWishDialogOpen(true);
  };
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        // Fetch messages where user is receiver
        const { data: messagesData, error } = await supabase
          .from("messages")
          .select("*")
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (messagesData && messagesData.length > 0) {
          // Get unique sender IDs
          const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
          
          // Fetch sender profiles
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, username")
            .in("user_id", senderIds);

          // Map profiles to messages
          const messagesWithSenders = messagesData.map(msg => ({
            ...msg,
            sender: profiles?.find(p => p.user_id === msg.sender_id) || null
          }));

          setMessages(messagesWithSenders);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch online friends (friends with recent activity)
  useEffect(() => {
    if (!user) return;

    const fetchOnlineFriends = async () => {
      try {
        // Get accepted friendships
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted")
          .limit(10);

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f => 
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          );

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, username, updated_at")
            .in("user_id", friendIds);

          if (profiles) {
            // Consider users "online" if updated in last 15 minutes
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            const onlineProfiles = profiles.map(p => ({
              user_id: p.user_id,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              username: p.username,
              isOnline: new Date(p.updated_at) > fifteenMinutesAgo
            })).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

            setOnlineFriends(onlineProfiles.slice(0, 8));
          }
        }
      } catch (error) {
        console.error("Error fetching online friends:", error);
      }
    };

    fetchOnlineFriends();
  }, [user]);

  // Play birthday confetti animation
  const playBirthdayConfetti = useCallback(() => {
    // First burst - from left
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
      colors: ['#ff69b4', '#ff1493', '#ffb6c1', '#ffd700', '#ff6347']
    });

    // Second burst - from right (slight delay)
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.9, y: 0.6 },
        colors: ['#ff69b4', '#ff1493', '#ffb6c1', '#ffd700', '#ff6347']
      });
    }, 200);

    // Center burst with stars
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        shapes: ['star'],
        colors: ['#ffd700', '#ffec8b', '#fffacd']
      });
    }, 400);
  }, []);

  // Play birthday chime sound
  const playBirthdaySound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a cheerful birthday melody
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play a celebratory tune (C-E-G-C pattern)
      const now = audioContext.currentTime;
      playNote(523.25, now, 0.15);       // C5
      playNote(659.25, now + 0.15, 0.15); // E5
      playNote(783.99, now + 0.30, 0.15); // G5
      playNote(1046.50, now + 0.45, 0.3); // C6
    } catch (error) {
      console.log('Could not play birthday sound');
    }
  }, []);

  // Track if birthday notification was shown this session
  const birthdayNotificationShown = useRef<Set<string>>(new Set());

  // Fetch birthday reminders
  useEffect(() => {
    if (!user) return;

    const fetchBirthdays = async () => {
      try {
        // Get accepted friendships
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted");

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f => 
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          );

          // Get private profiles with birthdays
          const { data: privateProfiles } = await supabase
            .from("profiles_private")
            .select("user_id, birthday")
            .in("user_id", friendIds)
            .not("birthday", "is", null);

          if (privateProfiles && privateProfiles.length > 0) {
            const { data: publicProfiles } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url")
              .in("user_id", privateProfiles.map(p => p.user_id));

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = addDays(today, 1);
            const reminderEndDate = addDays(today, birthdayReminderDays);

            const birthdayReminders: BirthdayReminder[] = [];

            privateProfiles.forEach(pp => {
              if (!pp.birthday) return;
              
              const birthday = new Date(pp.birthday);
              // Normalize birthday to this year
              let thisYearBday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
              
              // If birthday has passed this year, check next year
              if (thisYearBday < today) {
                thisYearBday = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
              }
              
              // Calculate days until birthday
              const daysUntil = differenceInDays(thisYearBday, today);
              
              // Check if birthday is within the reminder window
              if (daysUntil >= 0 && daysUntil <= birthdayReminderDays) {
                const publicProfile = publicProfiles?.find(p => p.user_id === pp.user_id);
                const isBirthdayToday = daysUntil === 0;
                
                birthdayReminders.push({
                  user_id: pp.user_id,
                  display_name: publicProfile?.display_name || null,
                  avatar_url: publicProfile?.avatar_url || null,
                  birthday: thisYearBday,
                  isToday: isBirthdayToday,
                  isTomorrow: daysUntil === 1,
                  daysUntil
                });

                // Show toast notification for today's birthdays (once per session)
                if (isBirthdayToday && !birthdayNotificationShown.current.has(pp.user_id)) {
                  birthdayNotificationShown.current.add(pp.user_id);
                  
                  // Delay to ensure UI is ready
                  setTimeout(() => {
                    playBirthdayConfetti();
                    playBirthdaySound();
                    toast.success(
                      t("sidebar.birthdayNotification", "🎂 It's {{name}}'s birthday today!", {
                        name: publicProfile?.display_name || t("common.friend", "a friend")
                      }),
                      {
                        description: t("sidebar.birthdayNotificationDesc", "Don't forget to wish them a happy birthday!"),
                        duration: 8000,
                        action: {
                          label: t("sidebar.sendWish", "Send Wish"),
                          onClick: () => navigate(`/profile/${pp.user_id}?action=post&message=${encodeURIComponent(t("sidebar.birthdayWallPost", "Happy Birthday! 🎂🎉"))}`)
                        }
                      }
                    );
                  }, 1500);
                }
              }
            });

            // Sort by days until birthday (today first)
            birthdayReminders.sort((a, b) => a.daysUntil - b.daysUntil);
            setBirthdays(birthdayReminders.slice(0, 5));
          }
        }
      } catch (error) {
        console.error("Error fetching birthdays:", error);
      }
    };

    fetchBirthdays();
  }, [user, playBirthdayConfetti, playBirthdaySound, navigate, t, birthdayReminderDays]);

  // Fetch trending posts
  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, content, likes_count, comments_count, user_id")
          .eq("visibility", "public")
          .order("likes_count", { ascending: false })
          .limit(5);

        if (posts && posts.length > 0) {
          const userIds = [...new Set(posts.map(p => p.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          const trending = posts.map(post => ({
            id: post.id,
            content: post.content || "",
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            author: profiles?.find(p => p.user_id === post.user_id) || { display_name: null, avatar_url: null }
          }));

          setTrendingPosts(trending);
        }
      } catch (error) {
        console.error("Error fetching trending posts:", error);
      }
    };

    fetchTrendingPosts();
  }, []);

  // Fetch active Tic-Tac-Toe games
  useEffect(() => {
    if (!user) return;

    const fetchActiveGames = async () => {
      try {
        const { data: games } = await supabase
          .from("tic_tac_toe_games")
          .select("*")
          .or(`player_x.eq.${user.id},player_o.eq.${user.id}`)
          .in("status", ["active", "pending"])
          .order("updated_at", { ascending: false })
          .limit(5);

        if (games && games.length > 0) {
          const opponentIds = games.map(g => 
            g.player_x === user.id ? g.player_o : g.player_x
          ).filter(Boolean);

          let profiles: any[] = [];
          if (opponentIds.length > 0) {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url")
              .in("user_id", opponentIds);
            profiles = profilesData || [];
          }

          const gamesWithOpponents = games.map(game => {
            const isPlayerX = game.player_x === user.id;
            const opponentId = isPlayerX ? game.player_o : game.player_x;
            const opponent = profiles.find(p => p.user_id === opponentId);
            const isMyTurn = (isPlayerX && game.current_turn === 'x') || (!isPlayerX && game.current_turn === 'o');

            return {
              id: game.id,
              player_x: game.player_x,
              player_o: game.player_o,
              current_turn: game.current_turn,
              status: game.status,
              opponent: opponent || null,
              isMyTurn: game.status === 'active' ? isMyTurn : game.status === 'pending' && !isPlayerX
            };
          });

          setActiveGames(gamesWithOpponents);
        } else {
          setActiveGames([]);
        }
      } catch (error) {
        console.error("Error fetching active games:", error);
      }
    };

    fetchActiveGames();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tic-tac-toe-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_tac_toe_games'
        },
        () => {
          fetchActiveGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filter messages based on tab
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = searchQuery === "" || 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "notification") {
      // Show recent messages (last 24 hours) that are new
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(msg.created_at) > dayAgo;
    } else {
      // Show unread messages (read_at is null)
      return msg.read_at === null;
    }
  });

  const handleMessageClick = (msg: MessageWithSender) => {
    // Navigate to member dashboard with messages tab
    navigate("/dashboard?tab=messages&sender=" + msg.sender_id);
  };

  const truncateMessage = (content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const unreadCount = messages.filter(m => m.read_at === null).length;
  const onlineCount = onlineFriends.filter(f => f.isOnline).length;

  return (
    <aside className="w-[320px] flex-shrink-0 hidden xl:block">
      <div className="fixed w-[320px] h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide pt-4 pb-8 pl-2">

        {/* Birthday Reminders */}
        {birthdays.length > 0 && (
          <div className="bg-card rounded-xl p-4 mb-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold text-foreground">{t("sidebar.birthdays", "Birthdays")}</h3>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border border-border">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {t("sidebar.birthdayReminder.title", "Remind me")}
                  </div>
                  {BIRTHDAY_REMINDER_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleReminderDaysChange(option.value)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{t(option.label, option.fallback)}</span>
                      {birthdayReminderDays === option.value && (
                        <Check className="h-4 w-4 text-pink-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-3">
              {birthdays.map((bday) => (
                <div
                  key={bday.user_id}
                  className={cn(
                    "p-3 -mx-1 rounded-lg transition-colors",
                    bday.isToday 
                      ? "bg-pink-500/10" 
                      : "bg-secondary/30"
                  )}
                >
                  <div 
                    onClick={() => navigate(`/profile/${bday.user_id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={bday.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white text-xs">
                        {bday.display_name?.split(" ").map(n => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {bday.display_name || t("common.unknown", "Unknown")}
                      </p>
                      <p className={cn(
                        "text-xs",
                        bday.isToday ? "text-pink-500 font-medium" : "text-muted-foreground"
                      )}>
                        {bday.isToday 
                          ? t("sidebar.birthdayToday", "🎂 Birthday today!") 
                          : bday.isTomorrow 
                            ? t("sidebar.birthdayTomorrow", "Tomorrow")
                            : bday.daysUntil <= 7 
                              ? t("sidebar.birthdayInDays", "In {{days}} days", { days: bday.daysUntil })
                              : format(bday.birthday, "MMM d")}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs gap-1.5 hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard?tab=messages&recipient=${bday.user_id}&message=${encodeURIComponent(t("sidebar.birthdayMessage", "Happy Birthday! 🎂🎉 Wishing you an amazing day!"))}`);
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t("sidebar.sendMessage", "Message")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs gap-1.5 hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${bday.user_id}?action=post&message=${encodeURIComponent(t("sidebar.birthdayWallPost", "Happy Birthday! 🎂🎉"))}`);
                      }}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      {t("sidebar.postOnWall", "Post")}
                    </Button>
                    {/* Schedule wish button for future birthdays */}
                    {bday.daysUntil > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleWish(bday);
                        }}
                        title={t("sidebar.scheduleWish", "Schedule wish")}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <div className="bg-card rounded-xl p-4 mb-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-foreground">{t("sidebar.onlineFriends", "Friends")}</h3>
              </div>
              {onlineCount > 0 && (
                <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                  {onlineCount} {t("sidebar.online", "online")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {onlineFriends.map((friend) => (
                <div
                  key={friend.user_id}
                  onClick={() => navigate(`/profile/${friend.user_id}`)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-xs">
                        {friend.display_name?.split(" ").map(n => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <Circle 
                      className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 fill-current border-2 border-card rounded-full",
                        friend.isOnline ? "text-green-500" : "text-gray-400"
                      )} 
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-full text-center">
                    {friend.display_name?.split(" ")[0] || "User"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Posts */}
        {trendingPosts.length > 0 && (
          <div className="bg-card rounded-xl p-4 mb-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-foreground">{t("sidebar.trending", "Trending")}</h3>
            </div>
            <div className="space-y-2">
              {trendingPosts.slice(0, 4).map((post, index) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/?post=${post.id}`)}
                  className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="text-lg font-bold text-muted-foreground w-5">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">
                      {truncateMessage(post.content, 60)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-card rounded-xl p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">{t("notifications.title", "Notifications")}</h3>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary border-0 text-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1 mb-3">
            {(["notification", "unread"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors capitalize relative",
                  activeTab === tab 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "notification" ? t("notifications.new", "Notification") : t("notifications.unread", "Unread")}
                {tab === "unread" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] p-0.5 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="space-y-1">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("common.loading", "Loading...")}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {activeTab === "notification" 
                  ? t("notifications.noNew", "No new notifications") 
                  : t("notifications.noUnread", "No unread messages")}
              </div>
            ) : (
              filteredMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={cn(
                    "flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors",
                    !msg.read_at && "bg-primary/5"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-xs">
                        {msg.sender?.display_name?.split(" ").map(n => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {!msg.read_at && (
                      <div className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-sm truncate",
                        !msg.read_at ? "font-semibold text-foreground" : "font-medium text-foreground"
                      )}>
                        {msg.sender?.display_name || t("common.unknown", "Unknown")}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      !msg.read_at ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {truncateMessage(msg.content)}
                    </p>
                  </div>
                </div>
              ))
            )}
            {filteredMessages.length > 5 && (
              <Button 
                variant="link" 
                className="text-muted-foreground p-0 h-auto text-sm hover:text-foreground"
                onClick={() => navigate("/dashboard?tab=messages")}
              >
                {t("sidebar.viewAll", "View All")}
              </Button>
            )}
          </div>
        </div>

        {/* Tic-Tac-Toe Games */}
        <div className="relative rounded-xl p-4 border border-primary/20 overflow-hidden">
          {/* Background with gradient and pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/30 dark:from-primary/20 dark:via-accent/15 dark:to-secondary/20" />
          <div 
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{t("sidebar.ticTacToe", "Tic-Tac-Toe")}</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-background/50"
                onClick={() => navigate("/games")}
              >
                {t("sidebar.viewAll", "View All")}
              </Button>
            </div>

            <div className="space-y-2">
              {activeGames.length === 0 ? (
                <div className="text-center py-4 bg-background/40 rounded-lg backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-2">{t("sidebar.noActiveGames", "No active games")}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/games")}
                    className="gap-2 bg-background/80"
                  >
                    <Play className="h-3 w-3" />
                    {t("sidebar.startGame", "Start a Game")}
                  </Button>
                </div>
              ) : (
                activeGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => navigate(`/games?game=${game.id}`)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all bg-background/50 backdrop-blur-sm hover:bg-background/70",
                      game.isMyTurn && "bg-background/70 ring-1 ring-primary/30 shadow-sm"
                    )}
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                      <AvatarImage src={game.opponent?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {game.opponent?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {game.opponent?.display_name || t("games.waitingForPlayer", "Waiting...")}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {game.isMyTurn ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {game.status === 'pending' ? t("games.acceptInvite", "Accept invite") : t("games.yourTurn", "Your turn!")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{t("games.waitingMove", "Waiting...")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Schedule Birthday Wish Dialog */}
      {selectedFriendForWish && (
        <ScheduleBirthdayWishDialog
          open={scheduleWishDialogOpen}
          onOpenChange={setScheduleWishDialogOpen}
          friend={selectedFriendForWish}
        />
      )}
    </aside>
  );
};
