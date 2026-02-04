import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Megaphone, Target, BarChart3, Plus, Eye, MousePointer, 
  TrendingUp, DollarSign, Users, Globe
} from "lucide-react";
import { CreateCampaignWizard } from "@/components/ads/CreateCampaignWizard";
import { CampaignsList } from "@/components/ads/CampaignsList";
import { AdOrdersList } from "@/components/ads/AdOrdersList";
import { useAuth } from "@/hooks/useAuth";

const AdsManager = () => {
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const features = [
    {
      icon: Target,
      title: "Precise Targeting",
      description: "Reach your ideal audience with demographics, interests, and behaviors",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track impressions, clicks, and conversions as they happen",
    },
    {
      icon: DollarSign,
      title: "Flexible Budgets",
      description: "Set daily or lifetime budgets that work for your business",
    },
    {
      icon: Globe,
      title: "Multi-placement",
      description: "Show ads in feed, sidebar, stories, and marketplace",
    },
  ];

  const objectives = [
    { id: "awareness", name: "Awareness", icon: Eye, color: "bg-blue-500" },
    { id: "traffic", name: "Traffic", icon: MousePointer, color: "bg-green-500" },
    { id: "engagement", name: "Engagement", icon: TrendingUp, color: "bg-purple-500" },
    { id: "leads", name: "Leads", icon: Users, color: "bg-orange-500" },
    { id: "sales", name: "Sales", icon: DollarSign, color: "bg-pink-500" },
  ];

  if (showWizard) {
    return <CreateCampaignWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8 md:p-12">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Ads Manager</h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mb-6">
              Create and manage ads to reach your target audience. Get your message in front of the right people at the right time.
            </p>
            <Button size="lg" onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="h-5 w-5" />
              Create New Campaign
            </Button>
          </div>
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
            <Megaphone className="w-full h-full" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaign Objectives */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Objective</CardTitle>
            <CardDescription>
              What do you want to achieve with your ads?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {objectives.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setShowWizard(true)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className={`p-3 rounded-full ${obj.color}/10`}>
                    <obj.icon className={`h-6 w-6 ${obj.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="font-medium text-sm">{obj.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Campaigns and Orders */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="overview">My Campaigns</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <CampaignsList />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <AdOrdersList />
          </TabsContent>
        </Tabs>

        {/* Info for non-members */}
        {!user && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                You don't need an account to create ads! Simply enter your email during checkout to track your campaigns.
              </p>
              <Button variant="outline" onClick={() => setShowWizard(true)}>
                Get Started Without Signing Up
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default AdsManager;
