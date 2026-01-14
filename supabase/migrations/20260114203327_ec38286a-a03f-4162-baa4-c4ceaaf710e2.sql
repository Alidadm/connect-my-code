-- Add Stripe Connect account ID column to profiles_private
ALTER TABLE public.profiles_private 
ADD COLUMN IF NOT EXISTS stripe_connect_id text;

-- Comment for documentation
COMMENT ON COLUMN public.profiles_private.stripe_connect_id IS 'Stripe Connect account ID for receiving commission payouts';
