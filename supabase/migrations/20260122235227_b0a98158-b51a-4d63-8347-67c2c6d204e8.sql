-- Create table for tracking post preferences (interested/not interested)
CREATE TABLE public.post_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  preference TEXT NOT NULL CHECK (preference IN ('interested', 'not_interested')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create table for hidden posts
CREATE TABLE public.hidden_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_preferences
CREATE POLICY "Users can view their own preferences"
ON public.post_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
ON public.post_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.post_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.post_preferences FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for hidden_posts
CREATE POLICY "Users can view their own hidden posts"
ON public.hidden_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can hide posts"
ON public.hidden_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide posts"
ON public.hidden_posts FOR DELETE
USING (auth.uid() = user_id);