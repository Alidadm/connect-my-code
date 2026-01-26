-- Create marketplace categories table
CREATE TABLE public.marketplace_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '📦',
  parent_id UUID REFERENCES public.marketplace_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view marketplace categories"
  ON public.marketplace_categories FOR SELECT
  USING (true);

-- Create marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  category_id UUID REFERENCES public.marketplace_categories(id),
  condition TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'removed', 'expired')),
  
  -- Location
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  
  -- Delivery options
  allow_pickup BOOLEAN DEFAULT true,
  allow_shipping BOOLEAN DEFAULT false,
  shipping_price NUMERIC(10, 2),
  
  -- Payment options
  contact_only BOOLEAN DEFAULT true,
  enable_checkout BOOLEAN DEFAULT false,
  
  -- Media
  images TEXT[] DEFAULT '{}',
  
  -- Stats
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  
  -- Visibility
  hide_from_friends BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

-- Users can create their own listings
CREATE POLICY "Users can create listings"
  ON public.marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users can update their own listings"
  ON public.marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete their own listings"
  ON public.marketplace_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Create saved listings table
CREATE TABLE public.marketplace_saved_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_saved_listings ENABLE ROW LEVEL SECURITY;

-- Users can view their saved listings
CREATE POLICY "Users can view their saved listings"
  ON public.marketplace_saved_listings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save listings
CREATE POLICY "Users can save listings"
  ON public.marketplace_saved_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave listings
CREATE POLICY "Users can unsave listings"
  ON public.marketplace_saved_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Create marketplace messages table (for listing inquiries)
CREATE TABLE public.marketplace_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_offer BOOLEAN DEFAULT false,
  offer_amount NUMERIC(10, 2),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their messages
CREATE POLICY "Users can view their marketplace messages"
  ON public.marketplace_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send marketplace messages"
  ON public.marketplace_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (for read_at)
CREATE POLICY "Users can mark messages as read"
  ON public.marketplace_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create recently viewed listings table
CREATE TABLE public.marketplace_recently_viewed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_recently_viewed ENABLE ROW LEVEL SECURITY;

-- Users can view their recently viewed
CREATE POLICY "Users can view their recently viewed"
  ON public.marketplace_recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to recently viewed
CREATE POLICY "Users can add to recently viewed"
  ON public.marketplace_recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update recently viewed
CREATE POLICY "Users can update recently viewed"
  ON public.marketplace_recently_viewed FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete from recently viewed
CREATE POLICY "Users can delete from recently viewed"
  ON public.marketplace_recently_viewed FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.marketplace_categories (name, slug, icon, sort_order) VALUES
  ('Vehicles', 'vehicles', '🚗', 1),
  ('Property Rentals', 'rentals', '🏠', 2),
  ('Electronics', 'electronics', '📱', 3),
  ('Home & Garden', 'home-garden', '🏡', 4),
  ('Clothing & Accessories', 'clothing', '👔', 5),
  ('Family', 'family', '👨‍👩‍👧', 6),
  ('Entertainment', 'entertainment', '🎮', 7),
  ('Sports & Outdoors', 'sports', '⚽', 8),
  ('Office Supplies', 'office', '💼', 9),
  ('Musical Instruments', 'music', '🎸', 10),
  ('Pet Supplies', 'pets', '🐕', 11),
  ('Free Stuff', 'free', '🎁', 12);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;