-- Add PayPal payout email field to profiles_private for auto-payouts
ALTER TABLE public.profiles_private
ADD COLUMN IF NOT EXISTS paypal_payout_email TEXT;