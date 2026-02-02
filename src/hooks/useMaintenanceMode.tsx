import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .single();

        if (error) {
          console.error("Error fetching maintenance mode:", error);
          setIsMaintenanceMode(false);
        } else {
          const value = data?.value as { enabled?: boolean } | null;
          setIsMaintenanceMode(value?.enabled ?? false);
        }
      } catch (err) {
        console.error("Error:", err);
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceStatus();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("maintenance-mode")
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "site_settings",
          filter: "key=eq.maintenance_mode"
        },
        (payload) => {
          const value = payload.new.value as { enabled?: boolean } | null;
          setIsMaintenanceMode(value?.enabled ?? false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isMaintenanceMode, loading };
};
