-- Create penpal_comments table for public comments on PenPal profiles
CREATE TABLE public.penpal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups by profile
CREATE INDEX idx_penpal_comments_profile ON public.penpal_comments(profile_user_id);
CREATE INDEX idx_penpal_comments_author ON public.penpal_comments(author_user_id);

-- Enable Row Level Security
ALTER TABLE public.penpal_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view comments
CREATE POLICY "Anyone can view penpal comments"
ON public.penpal_comments FOR SELECT
TO authenticated
USING (true);

-- Users can create comments
CREATE POLICY "Users can create penpal comments"
ON public.penpal_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own penpal comments"
ON public.penpal_comments FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own penpal comments"
ON public.penpal_comments FOR DELETE
TO authenticated
USING (auth.uid() = author_user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_penpal_comments_updated_at
BEFORE UPDATE ON public.penpal_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();