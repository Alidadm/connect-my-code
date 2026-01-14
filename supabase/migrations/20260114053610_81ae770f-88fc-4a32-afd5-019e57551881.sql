-- Add parent_comment_id column for nested replies to post_comments
ALTER TABLE public.post_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Create index for efficient parent comment queries
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

-- Create post_comment_likes table for liking comments
CREATE TABLE public.post_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on post_comment_likes
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_comment_likes
CREATE POLICY "Anyone can view comment likes" 
ON public.post_comment_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like comments" 
ON public.post_comment_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" 
ON public.post_comment_likes 
FOR DELETE 
USING (auth.uid() = user_id);