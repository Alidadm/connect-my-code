import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Send, Loader2 } from "lucide-react";
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
import confetti from "canvas-confetti";

interface SendBirthdayWishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export function SendBirthdayWishDialog({
  open,
  onOpenChange,
  friend,
}: SendBirthdayWishDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Set default message when dialog opens
  const defaultMessage = t(
    "birthday.defaultWishPost",
    "🎂 Happy Birthday, {{name}}! 🎉 Wishing you an amazing day filled with joy, love, and all the best things in life! Have a fantastic celebration! 🎈🎁",
    { name: friend.display_name?.split(" ")[0] || "friend" }
  );

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !message) {
      setMessage(defaultMessage);
    }
    onOpenChange(isOpen);
  };

  const handleSendWish = async () => {
    if (!user || !message.trim()) return;

    setLoading(true);
    try {
      // Create a post with the birthday wish
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: message.trim(),
        visibility: "public",
      });

      if (error) throw error;

      // Celebrate with confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FF69B4", "#00CED1", "#9370DB", "#FFA500"],
      });

      toast.success(t("birthday.wishSent", "Birthday wish posted!"), {
        description: t(
          "birthday.wishSentDesc",
          "Your birthday wish has been shared!"
        ),
      });
      
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error posting birthday wish:", error);
      toast.error(t("common.error", "Error"), {
        description: error.message || t("common.tryAgain", "Please try again"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            {t("birthday.sendWishTitle", "Send Birthday Wish")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "birthday.sendWishDesc",
              "Post a birthday wish for your friend!"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Friend info */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-lg border border-pink-500/20">
            <Avatar className="h-12 w-12 ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
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
              <p className="text-sm text-pink-500 font-medium">
                🎂 {t("birthday.celebratingToday", "Celebrating their birthday today!")}
              </p>
            </div>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("birthday.yourWish", "Your birthday wish")}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("birthday.writeWish", "Write your birthday wish...")}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSendWish}
            disabled={loading || !message.trim() || message.length > 500}
            className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("birthday.postWish", "Post Wish")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
