-- Add column to track if username has been changed
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username_changed boolean DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.username_changed IS 'Tracks if user has used their one-time username change';