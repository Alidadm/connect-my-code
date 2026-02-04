-- Create enum for campaign objectives (like Facebook)
CREATE TYPE public.ad_campaign_objective AS ENUM (
  'awareness',
  'traffic', 
  'engagement',
  'leads',
  'app_promotion',
  'sales'
);

-- Create enum for ad status
CREATE TYPE public.ad_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'active',
  'paused',
  'completed'
);

-- Create enum for budget type
CREATE TYPE public.ad_budget_type AS ENUM (
  'daily',
  'lifetime'
);

-- Create enum for ad placement
CREATE TYPE public.ad_placement AS ENUM (
  'feed',
  'sidebar',
  'stories',
  'marketplace',
  'all'
);

-- Main campaigns table
CREATE TABLE public.ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  name TEXT NOT NULL,
  objective ad_campaign_objective NOT NULL DEFAULT 'awareness',
  status ad_status NOT NULL DEFAULT 'draft',
  budget_type ad_budget_type NOT NULL DEFAULT 'daily',
  budget_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ad sets for targeting within campaigns
CREATE TABLE public.ad_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status ad_status NOT NULL DEFAULT 'draft',
  -- Targeting options
  target_locations TEXT[] DEFAULT '{}',
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  target_genders TEXT[] DEFAULT ARRAY['all'],
  target_interests TEXT[] DEFAULT '{}',
  target_behaviors TEXT[] DEFAULT '{}',
  target_languages TEXT[] DEFAULT '{}',
  -- Placement
  placements ad_placement[] DEFAULT ARRAY['all']::ad_placement[],
  -- Budget override for ad set
  daily_budget NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual ads with creatives
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status ad_status NOT NULL DEFAULT 'draft',
  -- Creative content
  headline TEXT NOT NULL,
  primary_text TEXT,
  description TEXT,
  call_to_action TEXT DEFAULT 'Learn More',
  destination_url TEXT NOT NULL,
  -- Media
  media_type TEXT DEFAULT 'image',
  media_url TEXT,
  -- Preview/engagement stats (for after approval)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table for payment tracking
CREATE TABLE public.ad_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  -- Payment info
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  -- Admin review
  status TEXT DEFAULT 'pending_review',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predefined targeting options for UI
CREATE TABLE public.ad_targeting_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_targeting_options ENABLE ROW LEVEL SECURITY;

-- Campaigns policies: users can manage their own, guests can create
CREATE POLICY "Users can view their own campaigns"
ON public.ad_campaigns FOR SELECT
USING (
  user_id = auth.uid() 
  OR user_id IS NULL
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can create campaigns"
ON public.ad_campaigns FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own campaigns"
ON public.ad_campaigns FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own campaigns"
ON public.ad_campaigns FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Ad sets policies
CREATE POLICY "Users can view ad sets of their campaigns"
ON public.ad_sets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c 
    WHERE c.id = campaign_id 
    AND (c.user_id = auth.uid() OR c.user_id IS NULL OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Anyone can create ad sets"
ON public.ad_sets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their ad sets"
ON public.ad_sets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c 
    WHERE c.id = campaign_id 
    AND (c.user_id = auth.uid() OR c.user_id IS NULL OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can delete their ad sets"
ON public.ad_sets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_campaigns c 
    WHERE c.id = campaign_id 
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Ads policies
CREATE POLICY "Users can view their ads"
ON public.ads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ad_sets s
    JOIN public.ad_campaigns c ON c.id = s.campaign_id
    WHERE s.id = ad_set_id 
    AND (c.user_id = auth.uid() OR c.user_id IS NULL OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Anyone can create ads"
ON public.ads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their ads"
ON public.ads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_sets s
    JOIN public.ad_campaigns c ON c.id = s.campaign_id
    WHERE s.id = ad_set_id 
    AND (c.user_id = auth.uid() OR c.user_id IS NULL OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can delete their ads"
ON public.ads FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ad_sets s
    JOIN public.ad_campaigns c ON c.id = s.campaign_id
    WHERE s.id = ad_set_id 
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Orders policies
CREATE POLICY "Users can view their orders"
ON public.ad_orders FOR SELECT
USING (
  user_id = auth.uid() 
  OR user_id IS NULL
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can create orders"
ON public.ad_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users and admins can update orders"
ON public.ad_orders FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'));

-- Targeting options are public read
CREATE POLICY "Anyone can view targeting options"
ON public.ad_targeting_options FOR SELECT
USING (true);

CREATE POLICY "Admins can manage targeting options"
ON public.ad_targeting_options FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_ad_campaigns_user_id ON public.ad_campaigns(user_id);
CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX idx_ad_orders_campaign_id ON public.ad_orders(campaign_id);
CREATE INDEX idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX idx_ad_orders_payment_status ON public.ad_orders(payment_status);

-- Triggers for updated_at
CREATE TRIGGER update_ad_campaigns_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_sets_updated_at
BEFORE UPDATE ON public.ad_sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_orders_updated_at
BEFORE UPDATE ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default targeting options
INSERT INTO public.ad_targeting_options (category, name, value, icon) VALUES
-- Interests
('interests', 'Technology', 'technology', '💻'),
('interests', 'Fashion', 'fashion', '👗'),
('interests', 'Food & Dining', 'food_dining', '🍽️'),
('interests', 'Travel', 'travel', '✈️'),
('interests', 'Fitness & Wellness', 'fitness_wellness', '💪'),
('interests', 'Entertainment', 'entertainment', '🎬'),
('interests', 'Sports', 'sports', '⚽'),
('interests', 'Business', 'business', '💼'),
('interests', 'Education', 'education', '📚'),
('interests', 'Music', 'music', '🎵'),
('interests', 'Gaming', 'gaming', '🎮'),
('interests', 'Art & Design', 'art_design', '🎨'),
('interests', 'Home & Garden', 'home_garden', '🏡'),
('interests', 'Parenting', 'parenting', '👨‍👩‍👧'),
('interests', 'Pets', 'pets', '🐾'),
-- Behaviors
('behaviors', 'Online Shoppers', 'online_shoppers', '🛒'),
('behaviors', 'Frequent Travelers', 'frequent_travelers', '🌍'),
('behaviors', 'Mobile Users', 'mobile_users', '📱'),
('behaviors', 'Early Adopters', 'early_adopters', '🚀'),
('behaviors', 'Engaged Shoppers', 'engaged_shoppers', '💳'),
('behaviors', 'Small Business Owners', 'small_business', '🏪'),
-- Locations (sample)
('locations', 'United States', 'US', '🇺🇸'),
('locations', 'United Kingdom', 'GB', '🇬🇧'),
('locations', 'Canada', 'CA', '🇨🇦'),
('locations', 'Australia', 'AU', '🇦🇺'),
('locations', 'Germany', 'DE', '🇩🇪'),
('locations', 'France', 'FR', '🇫🇷'),
('locations', 'Japan', 'JP', '🇯🇵'),
('locations', 'Brazil', 'BR', '🇧🇷'),
('locations', 'India', 'IN', '🇮🇳'),
('locations', 'Mexico', 'MX', '🇲🇽');

-- Create storage bucket for ad media
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-media', 'ad-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ad media
CREATE POLICY "Anyone can upload ad media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-media');

CREATE POLICY "Ad media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-media');

CREATE POLICY "Users can update their ad media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-media');

CREATE POLICY "Users can delete their ad media"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-media');