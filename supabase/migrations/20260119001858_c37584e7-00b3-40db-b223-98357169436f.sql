-- Add allow_direct_messages column to privacy_settings
ALTER TABLE public.privacy_settings 
ADD COLUMN IF NOT EXISTS allow_direct_messages boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.privacy_settings.allow_direct_messages IS 'Controls whether non-friends can send direct messages';