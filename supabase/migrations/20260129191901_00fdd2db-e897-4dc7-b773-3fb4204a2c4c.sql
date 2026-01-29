
-- Create news categories table (preset categories from Dolphysn)
CREATE TABLE public.news_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news items table
CREATE TABLE public.news_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.news_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '42 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user news preferences table (max 6 categories per user)
CREATE TABLE public.user_news_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.news_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_news_preferences ENABLE ROW LEVEL SECURITY;

-- News categories are readable by all authenticated users
CREATE POLICY "Anyone can view news categories"
  ON public.news_categories FOR SELECT
  USING (true);

-- News items are readable by all authenticated users
CREATE POLICY "Anyone can view news items"
  ON public.news_items FOR SELECT
  USING (true);

-- Users can view their own news preferences
CREATE POLICY "Users can view own news preferences"
  ON public.user_news_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own news preferences
CREATE POLICY "Users can insert own news preferences"
  ON public.user_news_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own news preferences
CREATE POLICY "Users can delete own news preferences"
  ON public.user_news_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_news_items_category ON public.news_items(category_id);
CREATE INDEX idx_news_items_expires ON public.news_items(expires_at);
CREATE INDEX idx_news_items_published ON public.news_items(published_at DESC);
CREATE INDEX idx_user_news_preferences_user ON public.user_news_preferences(user_id);

-- Insert preset categories
INSERT INTO public.news_categories (name, slug, icon, color, sort_order) VALUES
  ('Sports', 'sports', 'Trophy', '#22c55e', 1),
  ('Technology', 'technology', 'Cpu', '#3b82f6', 2),
  ('Business', 'business', 'Briefcase', '#f59e0b', 3),
  ('Entertainment', 'entertainment', 'Film', '#ec4899', 4),
  ('Health', 'health', 'Heart', '#ef4444', 5),
  ('Science', 'science', 'Atom', '#8b5cf6', 6),
  ('World News', 'world-news', 'Globe', '#06b6d4', 7),
  ('Politics', 'politics', 'Landmark', '#6366f1', 8),
  ('Finance', 'finance', 'TrendingUp', '#10b981', 9),
  ('Lifestyle', 'lifestyle', 'Sparkles', '#f472b6', 10);

-- Function to enforce max 6 categories per user
CREATE OR REPLACE FUNCTION public.check_max_news_categories()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_news_preferences WHERE user_id = NEW.user_id) >= 6 THEN
    RAISE EXCEPTION 'Maximum 6 news categories allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_max_news_categories
  BEFORE INSERT ON public.user_news_preferences
  FOR EACH ROW EXECUTE FUNCTION public.check_max_news_categories();

-- Function to cleanup expired news and enforce max 15 per category
CREATE OR REPLACE FUNCTION public.cleanup_news_items()
RETURNS void AS $$
BEGIN
  -- Delete expired news (older than 42 hours)
  DELETE FROM public.news_items WHERE expires_at < now();
  
  -- Delete oldest news if category has more than 15 items
  DELETE FROM public.news_items
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY published_at DESC) as rn
      FROM public.news_items
    ) ranked
    WHERE rn > 15
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
