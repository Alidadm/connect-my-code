-- Add onboarding_completed field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks whether user has completed the first-time onboarding flow';