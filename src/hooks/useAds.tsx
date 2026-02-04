import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdCampaignObjective = 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales';
export type AdStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'active' | 'paused' | 'completed';
export type AdBudgetType = 'daily' | 'lifetime';
export type AdPlacement = 'feed' | 'sidebar' | 'stories' | 'marketplace' | 'all';

export interface AdCampaign {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  name: string;
  objective: AdCampaignObjective;
  status: AdStatus;
  budget_type: AdBudgetType;
  budget_amount: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: AdStatus;
  target_locations: string[];
  target_age_min: number;
  target_age_max: number;
  target_genders: string[];
  target_interests: string[];
  target_behaviors: string[];
  target_languages: string[];
  placements: AdPlacement[];
  daily_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  ad_set_id: string;
  name: string;
  status: AdStatus;
  headline: string;
  primary_text: string | null;
  description: string | null;
  call_to_action: string;
  destination_url: string;
  media_type: string;
  media_url: string | null;
  impressions: number;
  clicks: number;
  spent: number;
  created_at: string;
  updated_at: string;
}

export interface AdOrder {
  id: string;
  campaign_id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  payment_status: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_quoted_price: number | null;
  quote_sent_at: string | null;
  quote_expires_at: string | null;
  created_at: string;
  updated_at: string;
  campaign?: AdCampaign;
}

export interface AdTargetingOption {
  id: string;
  category: string;
  name: string;
  value: string;
  icon: string | null;
}

export const useTargetingOptions = () => {
  return useQuery({
    queryKey: ["ad-targeting-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_targeting_options")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as AdTargetingOption[];
    },
  });
};

export const useAdCampaigns = () => {
  return useQuery({
    queryKey: ["ad-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdCampaign[];
    },
  });
};

export const useAdSets = (campaignId: string) => {
  return useQuery({
    queryKey: ["ad-sets", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_sets")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdSet[];
    },
    enabled: !!campaignId,
  });
};

export const useAds = (adSetId: string) => {
  return useQuery({
    queryKey: ["ads", adSetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("ad_set_id", adSetId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Ad[];
    },
    enabled: !!adSetId,
  });
};

export const useAdOrders = (isAdmin = false) => {
  return useQuery({
    queryKey: ["ad-orders", isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("ad_orders")
        .select(`
          *,
          campaign:ad_campaigns(*)
        `)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("user_id", user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdOrder[];
    },
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Partial<AdCampaign>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("ad_campaigns")
        .insert({
          user_id: user?.id || null,
          name: campaign.name!,
          objective: campaign.objective || 'awareness',
          budget_type: campaign.budget_type || 'daily',
          budget_amount: campaign.budget_amount || 0,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          guest_email: campaign.guest_email,
          guest_name: campaign.guest_name,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
    },
    onError: (error) => {
      toast.error("Failed to create campaign: " + error.message);
    },
  });
};

export const useCreateAdSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adSet: Partial<AdSet>) => {
      const { data, error } = await supabase
        .from("ad_sets")
        .insert({
          campaign_id: adSet.campaign_id!,
          name: adSet.name!,
          target_locations: adSet.target_locations || [],
          target_age_min: adSet.target_age_min || 18,
          target_age_max: adSet.target_age_max || 65,
          target_genders: adSet.target_genders || ['all'],
          target_interests: adSet.target_interests || [],
          target_behaviors: adSet.target_behaviors || [],
          target_languages: adSet.target_languages || [],
          placements: adSet.placements || ['all'],
          daily_budget: adSet.daily_budget,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdSet;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ad-sets", variables.campaign_id] });
    },
    onError: (error) => {
      toast.error("Failed to create ad set: " + error.message);
    },
  });
};

export const useCreateAd = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ad: Partial<Ad>) => {
      const { data, error } = await supabase
        .from("ads")
        .insert({
          ad_set_id: ad.ad_set_id!,
          name: ad.name!,
          headline: ad.headline!,
          primary_text: ad.primary_text,
          description: ad.description,
          call_to_action: ad.call_to_action || 'Learn More',
          destination_url: ad.destination_url!,
          media_type: ad.media_type || 'image',
          media_url: ad.media_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Ad;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ads", variables.ad_set_id] });
    },
    onError: (error) => {
      toast.error("Failed to create ad: " + error.message);
    },
  });
};

export const useCreateAdOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: { 
      campaignId: string; 
      amount: number; 
      guestEmail?: string; 
      guestName?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("ad_orders")
        .insert({
          campaign_id: order.campaignId,
          user_id: user?.id || null,
          amount: order.amount,
          guest_email: order.guestEmail,
          guest_name: order.guestName,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-orders"] });
    },
    onError: (error) => {
      toast.error("Failed to create order: " + error.message);
    },
  });
};

export const useUpdateCampaignStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdStatus }) => {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      adminNotes,
      quotedPrice,
    }: { 
      id: string; 
      status: string; 
      adminNotes?: string;
      quotedPrice?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, any> = { 
        status, 
        admin_notes: adminNotes,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      
      // If sending a quote, add price and expiration
      if (quotedPrice !== undefined && status === 'quoted') {
        updateData.admin_quoted_price = quotedPrice;
        updateData.quote_sent_at = new Date().toISOString();
        // Quote expires in 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        updateData.quote_expires_at = expiresAt.toISOString();
      }
      
      const { error } = await supabase
        .from("ad_orders")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });
};

export const uploadAdMedia = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("ad-media")
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("ad-media").getPublicUrl(fileName);
  return data.publicUrl;
};
