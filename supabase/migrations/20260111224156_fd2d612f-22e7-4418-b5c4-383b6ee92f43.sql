-- Create profiles_private table for sensitive data (Stripe/PayPal IDs, IP addresses)
-- This table is ONLY accessible by service role (edge functions), never by frontend

CREATE TABLE public.profiles_private (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  paypal_customer_id TEXT,
  signup_ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS with NO policies (service role bypasses RLS, users cannot access)
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

-- NO SELECT/INSERT/UPDATE/DELETE policies = only service role can access

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_private_updated_at
BEFORE UPDATE ON public.profiles_private
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing sensitive data from profiles to profiles_private
INSERT INTO public.profiles_private (user_id, stripe_customer_id, paypal_customer_id, signup_ip_address)
SELECT user_id, stripe_customer_id, paypal_customer_id, signup_ip_address
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL 
   OR paypal_customer_id IS NOT NULL 
   OR signup_ip_address IS NOT NULL;

-- Remove sensitive columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS paypal_customer_id,
  DROP COLUMN IF EXISTS signup_ip_address;