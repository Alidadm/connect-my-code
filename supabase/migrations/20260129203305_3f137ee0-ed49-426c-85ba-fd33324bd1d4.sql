-- Create table for user custom news categories
CREATE TABLE public.user_custom_news_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL,
  icon TEXT DEFAULT '📰',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT keywords_min_length CHECK (char_length(keywords) >= 2),
  CONSTRAINT keywords_max_length CHECK (char_length(keywords) <= 100),
  CONSTRAINT name_max_length CHECK (char_length(name) <= 50)
);

-- Enable RLS
ALTER TABLE public.user_custom_news_categories ENABLE ROW LEVEL SECURITY;

-- Users can only view their own custom categories
CREATE POLICY "Users can view own custom categories"
ON public.user_custom_news_categories
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own custom categories (max 4)
CREATE POLICY "Users can create own custom categories"
ON public.user_custom_news_categories
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (SELECT COUNT(*) FROM public.user_custom_news_categories WHERE user_id = auth.uid()) < 4
);

-- Users can update their own custom categories
CREATE POLICY "Users can update own custom categories"
ON public.user_custom_news_categories
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own custom categories
CREATE POLICY "Users can delete own custom categories"
ON public.user_custom_news_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Create table for custom category news items
CREATE TABLE public.user_custom_news_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_category_id UUID NOT NULL REFERENCES public.user_custom_news_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_custom_news_items ENABLE ROW LEVEL SECURITY;

-- Users can only view their own custom news items
CREATE POLICY "Users can view own custom news items"
ON public.user_custom_news_items
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert custom news items"
ON public.user_custom_news_items
FOR INSERT
WITH CHECK (true);

-- Service role can delete (for cleanup)
CREATE POLICY "Service role can delete custom news items"
ON public.user_custom_news_items
FOR DELETE
USING (true);

-- Add timestamp update trigger
CREATE TRIGGER update_user_custom_news_categories_updated_at
BEFORE UPDATE ON public.user_custom_news_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();