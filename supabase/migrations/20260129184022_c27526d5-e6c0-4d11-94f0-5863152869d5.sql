-- Create saved_sidebar_galleries table
CREATE TABLE public.saved_sidebar_galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_urls TEXT[] NOT NULL,
  author_display_name TEXT,
  author_avatar_url TEXT,
  author_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_sidebar_galleries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved galleries" 
ON public.saved_sidebar_galleries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved galleries" 
ON public.saved_sidebar_galleries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved galleries" 
ON public.saved_sidebar_galleries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate saves
CREATE UNIQUE INDEX saved_sidebar_galleries_user_post_unique 
ON public.saved_sidebar_galleries(user_id, post_id);

-- Create index for faster lookups
CREATE INDEX saved_sidebar_galleries_user_id_idx 
ON public.saved_sidebar_galleries(user_id);

CREATE INDEX saved_sidebar_galleries_created_at_idx 
ON public.saved_sidebar_galleries(created_at DESC);