-- Add suspension column to penpal_preferences
ALTER TABLE public.penpal_preferences 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.penpal_preferences.is_suspended IS 'When true, user is suspended from PenPals feature';