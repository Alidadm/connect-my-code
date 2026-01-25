import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cake, Gift, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";

interface BirthdayFriend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export const TodaysBirthdays = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [birthdayFriends, setBirthdayFriends] = useState<BirthdayFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchBirthdayFriends = async () => {
      try {
        // Call edge function to get friends with birthdays today
        // This uses service role to access profiles_private table
        const { data: session } = await supabase.auth.getSession();
        
        if (!session?.session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await supabase.functions.invoke("get-friends-birthdays", {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (response.error) {
          console.error("Error fetching birthday friends:", response.error);
          setLoading(false);
          return;
        }

        const friends = response.data?.friends || [];
        setBirthdayFriends(friends);
      } catch (error) {
        console.error("Error fetching birthday friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdayFriends();
  }, [user]);

  const handleCelebrate = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF69B4', '#00CED1', '#9370DB', '#FFA500']
    });
  };

  const handleViewProfile = (username: string | null) => {
    if (username) {
      navigate(`/${username}`);
    }
  };

  const handleSendMessage = (username: string | null) => {
    if (username) {
      navigate(`/${username}?action=message`);
    }
  };

  const nextBirthday = () => {
    setCurrentIndex((prev) => (prev + 1) % birthdayFriends.length);
  };

  const prevBirthday = () => {
    setCurrentIndex((prev) => (prev - 1 + birthdayFriends.length) % birthdayFriends.length);
  };

  if (loading || !user || birthdayFriends.length === 0) {
    return null;
  }

  const currentFriend = birthdayFriends[currentIndex];

  return (
    <Card className="mb-4 p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border-pink-500/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-pink-500/20 rounded-full">
          <Cake className="h-5 w-5 text-pink-500" />
        </div>
        <h3 className="font-semibold text-foreground">
          {t("feed.todaysBirthdays", "Today's Birthdays")} 🎂
        </h3>
        {birthdayFriends.length > 1 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {currentIndex + 1}/{birthdayFriends.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {birthdayFriends.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={prevBirthday}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-accent/50 rounded-lg p-2 transition-colors"
          onClick={() => handleViewProfile(currentFriend.username)}
        >
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
              <AvatarImage src={currentFriend.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                {currentFriend.display_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
              <Cake className="h-3 w-3 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {currentFriend.display_name || currentFriend.username || "Friend"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("feed.birthdayWish", "Celebrating their birthday today!")}
            </p>
          </div>
        </div>

        {birthdayFriends.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={nextBirthday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          variant="default"
          size="sm"
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          onClick={handleCelebrate}
        >
          <Gift className="h-4 w-4 mr-2" />
          {t("feed.celebrate", "Celebrate")} 🎉
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => handleSendMessage(currentFriend.username)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {t("feed.sendWish", "Send Wish")}
        </Button>
      </div>

      {/* Multiple birthday avatars preview */}
      {birthdayFriends.length > 1 && (
        <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-border/50">
          {birthdayFriends.map((friend, index) => (
            <button
              key={friend.user_id}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all ${index === currentIndex ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
            >
              <Avatar className={`h-8 w-8 ${index === currentIndex ? 'ring-2 ring-pink-500' : ''}`}>
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {friend.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
