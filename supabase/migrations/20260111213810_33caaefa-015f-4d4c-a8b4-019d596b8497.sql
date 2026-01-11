-- Add country column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create index on country for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);