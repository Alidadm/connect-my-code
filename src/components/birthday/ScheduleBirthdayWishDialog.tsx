import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CalendarClock, Send, X, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ScheduledWish {
  id: string;
  message: string;
  scheduled_date: string;
  status: string;
  created_at: string;
}

interface ScheduleBirthdayWishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    birthday: Date;
    daysUntil: number;
  };
}

export function ScheduleBirthdayWishDialog({
  open,
  onOpenChange,
  friend,
}: ScheduleBirthdayWishDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingWishes, setExistingWishes] = useState<ScheduledWish[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(true);

  // Default birthday message
  const defaultMessage = t(
    "birthday.defaultWish",
    "Happy Birthday, {{name}}! 🎂🎉 Wishing you an amazing day filled with joy and happiness!",
    { name: friend.display_name?.split(" ")[0] || "friend" }
  );

  // Fetch existing scheduled wishes for this friend
  useEffect(() => {
    if (!open || !user) return;

    const fetchScheduledWishes = async () => {
      setLoadingWishes(true);
      try {
        const { data, error } = await supabase
          .from("scheduled_birthday_wishes")
          .select("*")
          .eq("user_id", user.id)
          .eq("friend_user_id", friend.user_id)
          .eq("status", "pending")
          .order("scheduled_date", { ascending: true });

        if (error) throw error;
        setExistingWishes(data || []);
      } catch (error) {
        console.error("Error fetching scheduled wishes:", error);
      } finally {
        setLoadingWishes(false);
      }
    };

    fetchScheduledWishes();
    setMessage(defaultMessage);
  }, [open, user, friend.user_id, defaultMessage]);

  const handleSchedule = async () => {
    if (!user || !message.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("scheduled_birthday_wishes")
        .insert({
          user_id: user.id,
          friend_user_id: friend.user_id,
          message: message.trim(),
          scheduled_date: format(friend.birthday, "yyyy-MM-dd"),
          status: "pending",
        });

      if (error) throw error;

      toast.success(
        t("birthday.wishScheduled", "Birthday wish scheduled!"),
        {
          description: t(
            "birthday.wishScheduledDesc",
            "Your wish will be posted on {{date}}",
            { date: format(friend.birthday, "MMMM d") }
          ),
        }
      );
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error scheduling wish:", error);
      toast.error(t("common.error", "Error"), {
        description: error.message || t("common.tryAgain", "Please try again"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_birthday_wishes")
        .delete()
        .eq("id", wishId);

      if (error) throw error;

      setExistingWishes((prev) => prev.filter((w) => w.id !== wishId));
      toast.success(t("birthday.wishDeleted", "Scheduled wish deleted"));
    } catch (error: any) {
      console.error("Error deleting wish:", error);
      toast.error(t("common.error", "Error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-pink-500" />
            {t("birthday.scheduleWish", "Schedule Birthday Wish")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "birthday.scheduleWishDesc",
              "Your wish will be automatically posted on their birthday"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Friend info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white">
                {friend.display_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">
                {friend.display_name || t("common.unknown", "Unknown")}
              </p>
              <p className="text-sm text-muted-foreground">
                🎂 {format(friend.birthday, "MMMM d, yyyy")}
                {friend.daysUntil === 0 && (
                  <span className="text-pink-500 ml-2">
                    {t("birthday.today", "Today!")}
                  </span>
                )}
                {friend.daysUntil > 0 && (
                  <span className="text-muted-foreground ml-2">
                    ({t("birthday.inDays", "in {{days}} days", { days: friend.daysUntil })})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Existing scheduled wishes */}
          {loadingWishes ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : existingWishes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t("birthday.scheduledWishes", "Scheduled wishes")}
              </p>
              {existingWishes.map((wish) => (
                <div
                  key={wish.id}
                  className="flex items-start gap-2 p-2 bg-pink-500/10 rounded-lg text-sm"
                >
                  <p className="flex-1 text-foreground line-clamp-2">
                    {wish.message}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteWish(wish.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Message input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("birthday.yourMessage", "Your message")}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("birthday.writeWish", "Write your birthday wish...")}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={loading || !message.trim() || message.length > 500}
            className="gap-2 bg-pink-500 hover:bg-pink-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock className="h-4 w-4" />
            )}
            {t("birthday.schedule", "Schedule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
