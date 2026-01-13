-- Create password_reset_codes table for forgot password flow
CREATE TABLE public.password_reset_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    reset_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Deny all access from client - only service role can access
CREATE POLICY "Deny all access to password_reset_codes"
ON public.password_reset_codes
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_codes_phone ON public.password_reset_codes(phone);
CREATE INDEX idx_password_reset_codes_token ON public.password_reset_codes(reset_token);

-- Auto-cleanup expired codes (optional trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_codes()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.password_reset_codes WHERE expires_at < now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER cleanup_expired_codes
    AFTER INSERT ON public.password_reset_codes
    EXECUTE FUNCTION public.cleanup_expired_password_reset_codes();