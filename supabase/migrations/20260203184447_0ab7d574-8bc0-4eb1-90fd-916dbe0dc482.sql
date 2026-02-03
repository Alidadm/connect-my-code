-- Create follows table for one-way follow relationships
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Add follower/following counts to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows table
CREATE POLICY "Anyone can view follows"
ON public.follows FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following_count for the follower
    UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE user_id = NEW.follower_id;
    -- Increment followers_count for the followed user
    UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following_count for the follower
    UPDATE profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE user_id = OLD.follower_id;
    -- Decrement followers_count for the followed user
    UPDATE profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Create trigger for follow count updates
CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.update_follow_counts();

-- Enable realtime for follows table
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;