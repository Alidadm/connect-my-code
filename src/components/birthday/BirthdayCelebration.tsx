import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, PartyPopper, Gift, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export const BirthdayCelebration = () => {
  const { user, profile } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!user) return;

    const checkBirthday = async () => {
      // Check if we've already shown the celebration today
      const today = new Date().toISOString().split('T')[0];
      const lastCelebrationKey = `birthday_celebrated_${user.id}`;
      const lastCelebration = localStorage.getItem(lastCelebrationKey);
      
      if (lastCelebration === today) {
        return; // Already celebrated today
      }

      try {
        // Use edge function to check birthday (bypasses RLS with service role)
        const response = await supabase.functions.invoke("check-user-birthday", {
          body: { user_id: user.id },
        });

        if (response.error) {
          console.error("Error checking birthday:", response.error);
          return;
        }

        if (response.data?.isBirthday) {
          // It's the user's birthday!
          setFirstName(profile?.first_name || profile?.display_name?.split(' ')[0] || "");
          setShowCelebration(true);
          localStorage.setItem(lastCelebrationKey, today);
          
          // Trigger initial confetti
          triggerConfetti();
        }
      } catch (error) {
        console.error("Error checking birthday:", error);
      }
    };

    // Small delay to let the page load first
    const timer = setTimeout(checkBirthday, 1000);
    return () => clearTimeout(timer);
  }, [user, profile]);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FF69B4', '#00CED1', '#9370DB', '#FFA500', '#FF6B6B', '#4ECDC4'];

    (function frame() {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleCelebrate = () => {
    triggerConfetti();
  };

  const handleClose = () => {
    setShowCelebration(false);
  };

  if (!showCelebration) return null;

  return (
    <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none overflow-visible">
        <div className="relative">
          {/* Floating balloons */}
          <div className="absolute -top-20 left-0 right-0 flex justify-center gap-4 animate-bounce">
            <div className="w-12 h-16 bg-gradient-to-b from-red-400 to-red-600 rounded-full relative animate-float-slow">
              <div className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-gray-400 -translate-x-1/2 translate-y-full" />
            </div>
            <div className="w-12 h-16 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full relative animate-float-medium">
              <div className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-gray-400 -translate-x-1/2 translate-y-full" />
            </div>
            <div className="w-12 h-16 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full relative animate-float-fast">
              <div className="absolute bottom-0 left-1/2 w-0.5 h-6 bg-gray-400 -translate-x-1/2 translate-y-full" />
            </div>
            <div className="w-12 h-16 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full relative animate-float-slow">
              <div className="absolute bottom-0 left-1/2 w-0.5 h-9 bg-gray-400 -translate-x-1/2 translate-y-full" />
            </div>
            <div className="w-12 h-16 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full relative animate-float-medium">
              <div className="absolute bottom-0 left-1/2 w-0.5 h-7 bg-gray-400 -translate-x-1/2 translate-y-full" />
            </div>
          </div>

          {/* Main celebration card */}
          <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-3xl p-1 shadow-2xl mt-8">
            <div className="bg-background rounded-3xl p-6 text-center">
              {/* Cake icon with glow */}
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-pink-500/30 blur-xl rounded-full" />
                <div className="relative bg-gradient-to-br from-pink-500 to-purple-600 p-4 rounded-full">
                  <Cake className="h-12 w-12 text-white" />
                </div>
                {/* Sparkles */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 h-5 w-5 text-yellow-400 animate-pulse delay-100" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                Happy Birthday{firstName ? `, ${firstName}` : ""}! 🎂
              </h2>

              {/* Message */}
              <p className="text-muted-foreground mb-4">
                Wishing you a fantastic day filled with joy, laughter, and wonderful memories!
              </p>

              {/* From Dolphysn */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Gift className="h-5 w-5 text-pink-500" />
                <span className="text-sm font-medium text-foreground">
                  With love from the Dolphysn Team 💙
                </span>
              </div>

              {/* Decorative icons */}
              <div className="flex justify-center gap-3 mb-6">
                <span className="text-3xl animate-bounce delay-0">🎈</span>
                <span className="text-3xl animate-bounce delay-75">🎁</span>
                <span className="text-3xl animate-bounce delay-150">🎊</span>
                <span className="text-3xl animate-bounce delay-200">🎉</span>
                <span className="text-3xl animate-bounce delay-300">🥳</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleCelebrate}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                >
                  <PartyPopper className="h-4 w-4 mr-2" />
                  Celebrate! 🎉
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Thanks! 💙
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
