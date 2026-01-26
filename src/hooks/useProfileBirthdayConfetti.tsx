import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

export const useProfileBirthdayConfetti = (profileUserId: string | undefined) => {
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    if (!profileUserId) return;

    const checkBirthdayAndCelebrate = async () => {
      // Check localStorage to see if we already celebrated for this user today
      const today = new Date().toISOString().split('T')[0];
      const celebrationKey = `profile_birthday_celebrated_${profileUserId}`;
      const lastCelebration = localStorage.getItem(celebrationKey);

      if (lastCelebration === today) {
        return; // Already celebrated today for this profile
      }

      try {
        // Call edge function to check if it's their birthday
        const response = await supabase.functions.invoke("check-user-birthday", {
          body: { user_id: profileUserId },
        });

        if (response.error) {
          console.error("Error checking birthday:", response.error);
          return;
        }

        if (response.data?.isBirthday) {
          setIsBirthday(true);
          // Mark as celebrated for today
          localStorage.setItem(celebrationKey, today);

          // Trigger confetti animation
          triggerBirthdayConfetti();
        }
      } catch (error) {
        console.error("Error checking birthday:", error);
      }
    };

    // Small delay to let the profile load first
    const timer = setTimeout(checkBirthdayAndCelebrate, 500);
    return () => clearTimeout(timer);
  }, [profileUserId]);

  const triggerBirthdayConfetti = () => {
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

  return { isBirthday };
};
