import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, ArrowRight, Eye, MousePointer, TrendingUp, 
  Users, DollarSign, Smartphone, Target, ImageIcon, 
  Check, Monitor, Square, Loader2, CalendarIcon, CreditCard,
  Clock, Shield
} from "lucide-react";
import { AdFeedPreview } from "./AdFeedPreview";
import { AdImageEditor } from "./AdImageEditor";
import { useAuth } from "@/hooks/useAuth";
import { 
  useCreateCampaign, useCreateAdSet, useCreateAd, 
  useTargetingOptions, AdCampaignObjective 
} from "@/hooks/useAds";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AD_PRICING_TIERS, calculateAdPrice, formatPrice } from "@/lib/adPricing";

interface CreateCampaignWizardProps {
  onClose: () => void;
}

const STEPS = [
  { id: 1, name: "Objective", icon: Target },
  { id: 2, name: "Schedule & Price", icon: DollarSign },
  { id: 3, name: "Audience", icon: Users },
  { id: 4, name: "Creative", icon: ImageIcon },
  { id: 5, name: "Payment", icon: CreditCard },
];

const OBJECTIVES = [
  { id: "awareness", name: "Awareness", description: "Increase brand awareness", icon: Eye },
  { id: "traffic", name: "Traffic", description: "Drive traffic to your website", icon: MousePointer },
  { id: "engagement", name: "Engagement", description: "Get more likes, comments, shares", icon: TrendingUp },
  { id: "leads", name: "Leads", description: "Collect leads and sign-ups", icon: Users },
  { id: "app_promotion", name: "App Promotion", description: "Promote your mobile app", icon: Smartphone },
  { id: "sales", name: "Sales", description: "Drive online sales", icon: DollarSign },
];

const CTA_OPTIONS = [
  "Learn More", "Shop Now", "Sign Up", "Contact Us", "Download", 
  "Get Quote", "Book Now", "Subscribe", "Apply Now", "Get Offer"
];

export const CreateCampaignWizard = ({ onClose }: CreateCampaignWizardProps) => {
  const { user } = useAuth();
  const { data: targetingOptions = [] } = useTargetingOptions();
  const createCampaign = useCreateCampaign();
  const createAdSet = useCreateAdSet();
  const createAd = useCreateAd();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Objective
    objective: "awareness" as AdCampaignObjective,
    campaignName: "",
    
    // Step 2: Audience
    locations: [] as string[],
    ageMin: 18,
    ageMax: 65,
    genders: ["all"] as string[],
    interests: [] as string[],
    behaviors: [] as string[],
    placements: ["all"] as string[],
    
    // Schedule (required)
    startDate: null as Date | null,
    endDate: null as Date | null,
    selectedTierDays: null as number | null,
    
    // Step 3: Creative
    adName: "",
    headline: "",
    primaryText: "",
    description: "",
    callToAction: "Learn More",
    destinationUrl: "",
    mediaUrl: "",
    mediaFile: null as File | null,
  });

  const interests = targetingOptions.filter(o => o.category === "interests");
  const behaviors = targetingOptions.filter(o => o.category === "behaviors");
  const locations = targetingOptions.filter(o => o.category === "locations");

  const progress = (currentStep / STEPS.length) * 100;

  // Calculate price based on selected dates
  const campaignDays = formData.startDate && formData.endDate 
    ? differenceInDays(formData.endDate, formData.startDate) + 1
    : 0;
  const priceInfo = campaignDays > 0 ? calculateAdPrice(campaignDays) : null;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, value: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof prev] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  // Handle tier selection - auto-set dates based on tier
  const handleTierSelect = (tierDays: number) => {
    const startDate = formData.startDate || new Date();
    const endDate = addDays(startDate, tierDays - 1);
    setFormData(prev => ({
      ...prev,
      selectedTierDays: tierDays,
      startDate,
      endDate,
    }));
  };

  const handleSubmit = async () => {
    if (!priceInfo) {
      toast.error("Please select a valid campaign duration");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a campaign");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create campaign
      const campaign = await createCampaign.mutateAsync({
        name: formData.campaignName || `Campaign - ${new Date().toLocaleDateString()}`,
        objective: formData.objective,
        budget_type: "lifetime",
        budget_amount: priceInfo.price,
        start_date: formData.startDate ? formData.startDate.toISOString() : null,
        end_date: formData.endDate ? formData.endDate.toISOString() : null,
      });

      // Create ad set
      const adSet = await createAdSet.mutateAsync({
        campaign_id: campaign.id,
        name: "Ad Set 1",
        target_locations: formData.locations,
        target_age_min: formData.ageMin,
        target_age_max: formData.ageMax,
        target_genders: formData.genders,
        target_interests: formData.interests,
        target_behaviors: formData.behaviors,
        placements: formData.placements as any[],
      });

      // Create ad
      await createAd.mutateAsync({
        ad_set_id: adSet.id,
        name: formData.adName || "Ad 1",
        headline: formData.headline,
        primary_text: formData.primaryText,
        description: formData.description,
        call_to_action: formData.callToAction,
        destination_url: formData.destinationUrl,
        media_url: formData.mediaUrl,
      });

      // Create order with pending payment authorization
      await supabase.from("ad_orders").insert({
        campaign_id: campaign.id,
        user_id: user.id,
        amount: priceInfo.price,
        payment_status: "pending",
        status: "pending_payment",
      });

      // Redirect to Stripe checkout with authorization hold
      const { data, error } = await supabase.functions.invoke("create-ad-checkout", {
        body: {
          campaignId: campaign.id,
          amount: priceInfo.price,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // Open in same window to redirect user back to /ads after payment
        window.location.href = data.url;
        toast.success("Redirecting to payment...");
      }
    } catch (error: any) {
      toast.error("Failed to create campaign: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.objective && formData.campaignName;
      case 2:
        return formData.startDate && formData.endDate && campaignDays > 0;
      case 3:
        return true; // Audience targeting is optional
      case 4:
        return formData.headline && formData.destinationUrl;
      case 5:
        return !!user; // Must be logged in
      default:
        return true;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Ads Manager
          </Button>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step.id < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id === currentStep
                      ? "border-2 border-primary"
                      : "border-2 border-muted"
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs hidden md:block">{step.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Step 1: Objective */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-2">Choose Your Campaign Objective</CardTitle>
                  <CardDescription>
                    What do you want to achieve with this campaign?
                  </CardDescription>
                </div>

                <RadioGroup
                  value={formData.objective}
                  onValueChange={(v) => updateFormData("objective", v)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {OBJECTIVES.map((obj) => (
                    <div key={obj.id}>
                      <RadioGroupItem value={obj.id} id={obj.id} className="peer sr-only" />
                      <Label
                        htmlFor={obj.id}
                        className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <obj.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{obj.name}</div>
                          <div className="text-sm text-muted-foreground">{obj.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    value={formData.campaignName}
                    onChange={(e) => updateFormData("campaignName", e.target.value)}
                    placeholder="e.g., Summer Sale 2024"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Schedule & Pricing */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-2">Campaign Schedule & Pricing</CardTitle>
                  <CardDescription>
                    Choose how long you want your ad to run. Price is based on duration.
                  </CardDescription>
                </div>

                {/* Pricing Tiers */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Select Duration</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {AD_PRICING_TIERS.map((tier) => (
                      <div
                        key={tier.days}
                        onClick={() => handleTierSelect(tier.days)}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                          formData.selectedTierDays === tier.days
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "border-border"
                        )}
                      >
                        <div className="font-medium">{tier.label}</div>
                        <div className="text-2xl font-bold text-primary mt-1">
                          {formatPrice(tier.price)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tier.days} days
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Date Selection */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">Or customize your dates:</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.startDate ? format(formData.startDate, "PPP") : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.startDate || undefined}
                            onSelect={(date) => {
                              updateFormData("startDate", date || null);
                              updateFormData("selectedTierDays", null);
                              if (date && formData.endDate && formData.endDate < date) {
                                updateFormData("endDate", null);
                              }
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.endDate ? format(formData.endDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.endDate || undefined}
                            onSelect={(date) => {
                              updateFormData("endDate", date || null);
                              updateFormData("selectedTierDays", null);
                            }}
                            disabled={(date) => {
                              const minDate = formData.startDate || new Date();
                              return date < minDate;
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Price Summary */}
                {priceInfo && (
                  <Card className="bg-primary/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {campaignDays} day{campaignDays !== 1 ? "s" : ""} campaign
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formData.startDate && formData.endDate && (
                              <>From {format(formData.startDate, "MMM d, yyyy")} to {format(formData.endDate, "MMM d, yyyy")}</>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total Price</div>
                          <div className="text-2xl font-bold text-primary">
                            {formatPrice(priceInfo.price)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs text-muted-foreground">
                  Note: Ads expire automatically on the end date. Expired ads are not deleted but won't be shown. 
                  You can reorder the same ad to run it again. Ads are permanently deleted 90 days after expiration.
                </p>
              </div>
            )}

            {/* Step 3: Audience */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-2">Define Your Audience</CardTitle>
                  <CardDescription>
                    Who do you want to reach with your ads? (Optional - leave blank for all audiences)
                  </CardDescription>
                </div>

                {/* Locations */}
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((loc) => (
                      <Badge
                        key={loc.value}
                        variant={formData.locations.includes(loc.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem("locations", loc.value)}
                      >
                        {loc.icon} {loc.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Age Range */}
                <div className="space-y-4">
                  <Label>Age Range: {formData.ageMin} - {formData.ageMax}</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      type="number"
                      min={13}
                      max={formData.ageMax}
                      value={formData.ageMin}
                      onChange={(e) => updateFormData("ageMin", parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span>to</span>
                    <Input
                      type="number"
                      min={formData.ageMin}
                      max={100}
                      value={formData.ageMax}
                      onChange={(e) => updateFormData("ageMax", parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="flex gap-4">
                    {["all", "male", "female"].map((g) => (
                      <label key={g} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.genders.includes(g)}
                          onCheckedChange={() => {
                            if (g === "all") {
                              updateFormData("genders", ["all"]);
                            } else {
                              const newGenders = formData.genders.filter(x => x !== "all");
                              if (newGenders.includes(g)) {
                                updateFormData("genders", newGenders.filter(x => x !== g));
                              } else {
                                updateFormData("genders", [...newGenders, g]);
                              }
                            }
                          }}
                        />
                        <span className="capitalize">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div className="space-y-2">
                  <Label>Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((int) => (
                      <Badge
                        key={int.value}
                        variant={formData.interests.includes(int.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem("interests", int.value)}
                      >
                        {int.icon} {int.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Behaviors */}
                <div className="space-y-2">
                  <Label>Behaviors</Label>
                  <div className="flex flex-wrap gap-2">
                    {behaviors.map((beh) => (
                      <Badge
                        key={beh.value}
                        variant={formData.behaviors.includes(beh.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem("behaviors", beh.value)}
                      >
                        {beh.icon} {beh.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Placements */}
                <div className="space-y-2">
                  <Label>Ad Placements</Label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "feed", "sidebar", "stories", "marketplace"].map((p) => (
                      <Badge
                        key={p}
                        variant={formData.placements.includes(p) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => {
                          if (p === "all") {
                            updateFormData("placements", ["all"]);
                          } else {
                            const newPlacements = formData.placements.filter(x => x !== "all");
                            if (newPlacements.includes(p)) {
                              updateFormData("placements", newPlacements.filter(x => x !== p));
                            } else {
                              updateFormData("placements", [...newPlacements, p]);
                            }
                          }
                        }}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Creative */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-2">Create Your Ad</CardTitle>
                  <CardDescription>
                    Design the creative that people will see. See a live preview as you build.
                  </CardDescription>
                </div>

                {/* Two-column layout: Editor + Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Form Fields */}
                  <div className="space-y-4 order-2 lg:order-1">
                    {/* Ad Name */}
                    <div className="space-y-2">
                      <Label htmlFor="adName">Ad Name</Label>
                      <Input
                        id="adName"
                        value={formData.adName}
                        onChange={(e) => updateFormData("adName", e.target.value)}
                        placeholder="e.g., Summer Sale Banner"
                      />
                    </div>

                    {/* Image Editor */}
                    <AdImageEditor
                      mediaUrl={formData.mediaUrl}
                      onMediaChange={(url) => updateFormData("mediaUrl", url)}
                    />

                    {/* Headline */}
                    <div className="space-y-2">
                      <Label htmlFor="headline">Headline *</Label>
                      <Input
                        id="headline"
                        value={formData.headline}
                        onChange={(e) => updateFormData("headline", e.target.value)}
                        placeholder="e.g., Up to 50% Off Summer Collection"
                        maxLength={40}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {formData.headline.length}/40
                      </div>
                    </div>

                    {/* Primary Text */}
                    <div className="space-y-2">
                      <Label htmlFor="primaryText">Primary Text</Label>
                      <Textarea
                        id="primaryText"
                        value={formData.primaryText}
                        onChange={(e) => updateFormData("primaryText", e.target.value)}
                        placeholder="Tell people more about your offer..."
                        rows={3}
                        maxLength={125}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {formData.primaryText.length}/125
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                        placeholder="Optional description"
                        maxLength={30}
                      />
                    </div>

                    {/* CTA */}
                    <div className="space-y-2">
                      <Label>Call to Action</Label>
                      <Select
                        value={formData.callToAction}
                        onValueChange={(v) => updateFormData("callToAction", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_OPTIONS.map((cta) => (
                            <SelectItem key={cta} value={cta}>{cta}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Destination URL */}
                    <div className="space-y-2">
                      <Label htmlFor="destinationUrl">Destination URL *</Label>
                      <Input
                        id="destinationUrl"
                        type="url"
                        value={formData.destinationUrl}
                        onChange={(e) => updateFormData("destinationUrl", e.target.value)}
                        placeholder="https://yourwebsite.com/landing-page"
                      />
                    </div>
                  </div>

                  {/* Right Column: Live Preview */}
                  <div className="order-1 lg:order-2 lg:sticky lg:top-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Live Preview</span>
                      </div>
                      
                      {/* Preview Tabs for different placements */}
                      <Tabs defaultValue="feed" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="feed" className="text-xs gap-1">
                            <Monitor className="h-3 w-3" />
                            Feed
                          </TabsTrigger>
                          <TabsTrigger value="sidebar" className="text-xs gap-1">
                            <Square className="h-3 w-3" />
                            Sidebar
                          </TabsTrigger>
                          <TabsTrigger value="stories" className="text-xs gap-1">
                            <Smartphone className="h-3 w-3" />
                            Stories
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="feed" className="mt-4">
                          <AdFeedPreview
                            headline={formData.headline}
                            primaryText={formData.primaryText}
                            description={formData.description}
                            mediaUrl={formData.mediaUrl}
                            callToAction={formData.callToAction}
                            destinationUrl={formData.destinationUrl}
                            placement="feed"
                          />
                        </TabsContent>
                        
                        <TabsContent value="sidebar" className="mt-4">
                          <AdFeedPreview
                            headline={formData.headline}
                            primaryText={formData.primaryText}
                            description={formData.description}
                            mediaUrl={formData.mediaUrl}
                            callToAction={formData.callToAction}
                            destinationUrl={formData.destinationUrl}
                            placement="sidebar"
                          />
                        </TabsContent>
                        
                        <TabsContent value="stories" className="mt-4">
                          <AdFeedPreview
                            headline={formData.headline}
                            primaryText={formData.primaryText}
                            description={formData.description}
                            mediaUrl={formData.mediaUrl}
                            callToAction={formData.callToAction}
                            destinationUrl={formData.destinationUrl}
                            placement="stories"
                          />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-2">Review & Payment</CardTitle>
                  <CardDescription>
                    Review your campaign and complete payment. Your card will be authorized but not charged until admin approval.
                  </CardDescription>
                </div>

                {/* Summary */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign</span>
                      <span className="font-medium">{formData.campaignName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Objective</span>
                      <span className="font-medium capitalize">{formData.objective.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audience</span>
                      <span className="font-medium">
                        {formData.locations.length > 0 
                          ? `${formData.locations.length} locations` 
                          : "Worldwide"
                        }, Ages {formData.ageMin}-{formData.ageMax}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule</span>
                      <span className="font-medium">
                        {formData.startDate && formData.endDate 
                          ? `${format(formData.startDate, "MMM d, yyyy")} - ${format(formData.endDate, "MMM d, yyyy")}`
                          : "Not set"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{campaignDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Headline</span>
                      <span className="font-medium">{formData.headline}</span>
                    </div>
                    <div className="flex justify-between border-t pt-4">
                      <span className="font-semibold">Total Price</span>
                      <span className="font-bold text-xl text-primary">
                        {priceInfo ? formatPrice(priceInfo.price) : "$0.00"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Logged in user info */}
                {user && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-medium">Logged in as {user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Your campaign will be linked to your account
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Authorization Notice */}
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Secure Payment Authorization</div>
                        <div className="text-sm text-muted-foreground">
                          Your card will be <strong>authorized</strong> for {priceInfo ? formatPrice(priceInfo.price) : "$0.00"}, 
                          but <strong>not charged</strong> until our team approves your ad.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* What happens next */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm">
                      <strong>What happens next:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Your payment is authorized (held, not charged yet)</li>
                        <li>Our team reviews your ad creative and targeting</li>
                        <li>If approved, your payment is captured and your ad goes live!</li>
                        <li>If rejected, the authorization is released and you're not charged</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                {/* Expiration Notice */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Payment authorizations expire in 7 days if not approved.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay & Submit
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
