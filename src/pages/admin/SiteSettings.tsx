import React, { useState, useEffect } from "react";
import { Settings, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SiteSettings = () => {
  const { toast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .single();

        if (error) throw error;
        
        const value = data?.value as { enabled?: boolean } | null;
        setMaintenanceMode(value?.enabled ?? false);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const toggleMaintenanceMode = async (enabled: boolean) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("site_settings")
        .update({ 
          value: { enabled },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq("key", "maintenance_mode");

      if (error) throw error;

      setMaintenanceMode(enabled);
      toast({
        title: enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enabled 
          ? "Visitors will now see the signup page instead of the landing page." 
          : "The landing page is now visible to all visitors.",
      });
    } catch (error: any) {
      console.error("Error updating maintenance mode:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update maintenance mode",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground">
            Manage website visibility and maintenance options
          </p>
        </div>

        {/* Maintenance Mode Card */}
        <Card className={maintenanceMode ? "border-amber-500/50 bg-amber-500/10" : "border-green-500/50 bg-green-500/10"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {maintenanceMode ? (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-400" />
              )}
              <div>
                <CardTitle className="text-lg text-foreground">
                  Maintenance Mode
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {maintenanceMode 
                    ? "Website is currently showing the signup page to all visitors" 
                    : "Website is live with the full landing page visible"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="maintenance-toggle" className="text-base font-medium text-foreground">
                    {maintenanceMode ? "Under Maintenance" : "Website Live"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceMode 
                      ? "Turn off to show the landing page to visitors" 
                      : "Turn on to redirect visitors to the signup page"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    id="maintenance-toggle"
                    checked={maintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                    disabled={updating}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              How Maintenance Mode Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">When enabled:</strong> Non-authenticated visitors will see the Signup page 
              instead of the marketing landing page. This is useful when you want to focus on 
              member registration without showcasing all platform features.
            </p>
            <p>
              <strong className="text-foreground">When disabled:</strong> The full landing page with all marketing content 
              (features, pricing, referral benefits) will be visible to all visitors.
            </p>
            <p>
              <strong className="text-foreground">Note:</strong> Logged-in members will always see their normal feed regardless 
              of this setting.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SiteSettings;
