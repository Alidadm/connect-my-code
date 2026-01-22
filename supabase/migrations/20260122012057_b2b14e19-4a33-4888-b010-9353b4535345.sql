-- Create email verification codes table for onboarding
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- No public access - only accessible via service role in edge functions
-- This ensures codes can only be verified server-side

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON public.email_verification_codes(email);

-- Add trigger to auto-cleanup expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_verification_codes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.email_verification_codes WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (runs on insert to keep table clean)
DROP TRIGGER IF EXISTS cleanup_expired_email_codes ON public.email_verification_codes;
CREATE TRIGGER cleanup_expired_email_codes
  AFTER INSERT ON public.email_verification_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_email_verification_codes();