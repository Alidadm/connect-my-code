import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export const useBlockMute = (targetUserId?: string) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    const [blockedResult, mutedResult] = await Promise.all([
      supabase
        .from("blocked_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("blocked_user_id", targetUserId)
        .maybeSingle(),
      supabase
        .from("muted_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("muted_user_id", targetUserId)
        .maybeSingle(),
    ]);

    setIsBlocked(!!blockedResult.data);
    setIsMuted(!!mutedResult.data);
  }, [user, targetUserId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const blockUser = async () => {
    if (!user || !targetUserId) return;

    // If already blocked, just unblock without confirmation
    if (isBlocked) {
      setLoading(true);
      try {
        await supabase
          .from("blocked_users")
          .delete()
          .eq("user_id", user.id)
          .eq("blocked_user_id", targetUserId);

        setIsBlocked(false);
        toast.success(t("privacy.userUnblocked", { defaultValue: "User unblocked" }));
      } catch (error) {
        console.error("Error unblocking:", error);
        toast.error(t("common.error", { defaultValue: "An error occurred" }));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Show confirmation dialog before blocking
    const result = await Swal.fire({
      title: t("privacy.confirmBlockTitle", { defaultValue: "Block this user?" }),
      text: t("privacy.confirmBlockText", { defaultValue: "They won't be able to see your posts or contact you. You can unblock them anytime." }),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: t("privacy.blockUser", { defaultValue: "Block" }),
      cancelButtonText: t("common.cancel", { defaultValue: "Cancel" }),
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await supabase.from("blocked_users").insert({
        user_id: user.id,
        blocked_user_id: targetUserId,
      });

      setIsBlocked(true);
      toast.success(t("privacy.userBlocked", { defaultValue: "User blocked" }));
    } catch (error) {
      console.error("Error blocking:", error);
      toast.error(t("common.error", { defaultValue: "An error occurred" }));
    } finally {
      setLoading(false);
    }
  };

  const muteUser = async () => {
    if (!user || !targetUserId) return;
    setLoading(true);

    try {
      if (isMuted) {
        // Unmute
        await supabase
          .from("muted_users")
          .delete()
          .eq("user_id", user.id)
          .eq("muted_user_id", targetUserId);

        setIsMuted(false);
        toast.success(t("privacy.userUnmuted", { defaultValue: "User unmuted" }));
      } else {
        // Mute
        await supabase.from("muted_users").insert({
          user_id: user.id,
          muted_user_id: targetUserId,
        });

        setIsMuted(true);
        toast.success(t("privacy.userMuted", { defaultValue: "User muted" }));
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error(t("common.error", { defaultValue: "An error occurred" }));
    } finally {
      setLoading(false);
    }
  };

  return {
    isBlocked,
    isMuted,
    loading,
    blockUser,
    muteUser,
  };
};
