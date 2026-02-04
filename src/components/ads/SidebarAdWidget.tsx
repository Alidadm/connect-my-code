import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAfter, isBefore, parseISO } from "date-fns";

interface ActiveAd {
  id: string;
  headline: string;
  primary_text: string | null;
  media_url: string | null;
  call_to_action: string;
  destination_url: string;
}

interface SidebarAdWidgetProps {
  className?: string;
}

export const SidebarAdWidget = ({ className }: SidebarAdWidgetProps) => {
  const [ad, setAd] = useState<ActiveAd | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveAd = async () => {
      try {
        // Get site settings to check if sidebar ads are enabled
        const { data: settings } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "sidebar_ad_enabled")
          .single();

        if (settings?.value !== "true") {
          setLoading(false);
          return;
        }

        const now = new Date().toISOString();

        // Fetch active campaigns with sidebar placement
        const { data: campaigns } = await supabase
          .from("ad_campaigns")
          .select("id, start_date, end_date")
          .eq("status", "active")
          .lte("start_date", now)
          .gte("end_date", now)
          .limit(10);

        if (!campaigns || campaigns.length === 0) {
          setLoading(false);
          return;
        }

        // Get ad sets with sidebar placement
        const { data: adSets } = await supabase
          .from("ad_sets")
          .select("id, campaign_id")
          .in("campaign_id", campaigns.map(c => c.id))
          .or("placements.cs.{sidebar},placements.cs.{all}");

        if (!adSets || adSets.length === 0) {
          setLoading(false);
          return;
        }

        // Get a random ad from these ad sets
        const { data: ads } = await supabase
          .from("ads")
          .select("id, headline, primary_text, media_url, call_to_action, destination_url")
          .in("ad_set_id", adSets.map(a => a.id))
          .eq("status", "active")
          .limit(10);

        if (ads && ads.length > 0) {
          // Pick a random ad
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          setAd(randomAd);

          // Track impression
          await supabase
            .from("ads")
            .update({ impressions: (randomAd as any).impressions + 1 || 1 })
            .eq("id", randomAd.id);
        }
      } catch (error) {
        console.error("Error fetching sidebar ad:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveAd();
  }, []);

  const handleClick = async () => {
    if (!ad) return;

    // Track click
    try {
      await supabase
        .from("ads")
        .update({ clicks: (ad as any).clicks + 1 || 1 })
        .eq("id", ad.id);
    } catch (error) {
      console.error("Error tracking click:", error);
    }

    // Open destination
    const url = ad.destination_url.startsWith("http") 
      ? ad.destination_url 
      : `https://${ad.destination_url}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading || !ad || dismissed) {
    return null;
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss ad"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Ad Image */}
          {ad.media_url ? (
            <img
              src={ad.media_url}
              alt={ad.headline}
              className="w-full aspect-square object-cover cursor-pointer"
              onClick={handleClick}
            />
          ) : (
            <div 
              className="aspect-square bg-muted/30 flex items-center justify-center cursor-pointer"
              onClick={handleClick}
            >
              <Megaphone className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {/* Ad Content */}
          <div className="p-3">
            <Badge variant="outline" className="text-[10px] mb-2">
              Sponsored
            </Badge>
            <h4 
              className="font-semibold text-sm line-clamp-2 mb-1 cursor-pointer hover:text-primary transition-colors"
              onClick={handleClick}
            >
              {ad.headline}
            </h4>
            {ad.primary_text && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {ad.primary_text}
              </p>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs h-8"
              onClick={handleClick}
            >
              {ad.call_to_action}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
