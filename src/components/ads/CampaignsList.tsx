import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, MousePointer, TrendingUp, Users, DollarSign, 
  Smartphone, MoreHorizontal, Pause, Play, Trash2, BarChart3,
  Calendar, Clock, AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdCampaigns, useUpdateCampaignStatus, AdCampaignObjective, AdStatus } from "@/hooks/useAds";
import { format, differenceInDays, isPast, isFuture } from "date-fns";

const objectiveIcons: Record<AdCampaignObjective, any> = {
  awareness: Eye,
  traffic: MousePointer,
  engagement: TrendingUp,
  leads: Users,
  app_promotion: Smartphone,
  sales: DollarSign,
};

const statusColors: Record<AdStatus, string> = {
  draft: "bg-gray-500",
  pending_review: "bg-amber-500",
  approved: "bg-blue-500",
  rejected: "bg-red-500",
  active: "bg-green-500",
  paused: "bg-orange-500",
  completed: "bg-purple-500",
};

// Helper to get campaign schedule status
const getScheduleStatus = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) {
    return { label: "No schedule", color: "text-muted-foreground", icon: Clock };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (isPast(end)) {
    const daysExpired = differenceInDays(now, end);
    const daysUntilDelete = 90 - daysExpired;
    return { 
      label: `Expired ${daysExpired}d ago`, 
      color: "text-destructive",
      icon: AlertTriangle,
      daysUntilDelete: daysUntilDelete > 0 ? daysUntilDelete : 0
    };
  }
  
  if (isFuture(start)) {
    const daysUntilStart = differenceInDays(start, now);
    return { 
      label: `Starts in ${daysUntilStart}d`, 
      color: "text-blue-500",
      icon: Calendar
    };
  }
  
  const daysRemaining = differenceInDays(end, now);
  return { 
    label: `${daysRemaining}d remaining`, 
    color: "text-green-500",
    icon: Clock
  };
};

export const CampaignsList = () => {
  const { data: campaigns = [], isLoading } = useAdCampaigns();
  const updateStatus = useUpdateCampaignStatus();

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground">
            Create your first campaign to start reaching your audience.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => {
        const Icon = objectiveIcons[campaign.objective];
        const scheduleStatus = getScheduleStatus(campaign.start_date, campaign.end_date);
        const ScheduleIcon = scheduleStatus.icon;
        const isExpired = campaign.end_date && isPast(new Date(campaign.end_date));
        
        return (
          <Card key={campaign.id} className={isExpired ? "opacity-75" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <Badge className={`${statusColors[campaign.status]} text-white`}>
                        {campaign.status.replace("_", " ")}
                      </Badge>
                      {isExpired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {campaign.objective.replace("_", " ")} • ${campaign.budget_amount} {campaign.budget_type}
                    </p>
                    
                    {/* Schedule Info */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      {campaign.start_date && campaign.end_date ? (
                        <>
                          <span className="text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(campaign.start_date), "MMM d")} - {format(new Date(campaign.end_date), "MMM d, yyyy")}
                          </span>
                          <span className={scheduleStatus.color}>
                            <ScheduleIcon className="h-3 w-3 inline mr-1" />
                            {scheduleStatus.label}
                          </span>
                          {scheduleStatus.daysUntilDelete !== undefined && (
                            <span className="text-destructive">
                              (Auto-delete in {scheduleStatus.daysUntilDelete}d)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          No schedule set
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(campaign.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {campaign.status === "active" && !isExpired && (
                      <DropdownMenuItem 
                        onClick={() => updateStatus.mutate({ id: campaign.id, status: "paused" })}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Campaign
                      </DropdownMenuItem>
                    )}
                    {campaign.status === "paused" && !isExpired && (
                      <DropdownMenuItem 
                        onClick={() => updateStatus.mutate({ id: campaign.id, status: "active" })}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume Campaign
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats (placeholder for active campaigns) */}
              {campaign.status === "active" && !isExpired && (
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Impressions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Clicks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">$0.00</div>
                    <div className="text-xs text-muted-foreground">Spent</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
