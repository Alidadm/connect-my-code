import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, MousePointer, TrendingUp, Users, DollarSign, 
  Smartphone, MoreHorizontal, Pause, Play, Trash2, BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdCampaigns, useUpdateCampaignStatus, AdCampaignObjective, AdStatus } from "@/hooks/useAds";
import { format } from "date-fns";

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
        
        return (
          <Card key={campaign.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <Badge className={`${statusColors[campaign.status]} text-white`}>
                        {campaign.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {campaign.objective.replace("_", " ")} • ${campaign.budget_amount} {campaign.budget_type}
                    </p>
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
                    {campaign.status === "active" && (
                      <DropdownMenuItem 
                        onClick={() => updateStatus.mutate({ id: campaign.id, status: "paused" })}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Campaign
                      </DropdownMenuItem>
                    )}
                    {campaign.status === "paused" && (
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
              {campaign.status === "active" && (
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
