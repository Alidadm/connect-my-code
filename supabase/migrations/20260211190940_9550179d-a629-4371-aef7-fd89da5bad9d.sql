
-- Add Wise payout fields
ALTER TABLE public.profiles_private ADD COLUMN IF NOT EXISTS wise_email text;
ALTER TABLE public.profiles_private ADD COLUMN IF NOT EXISTS wise_account_id text;

-- Add Payoneer payout fields
ALTER TABLE public.profiles_private ADD COLUMN IF NOT EXISTS payoneer_email text;
ALTER TABLE public.profiles_private ADD COLUMN IF NOT EXISTS payoneer_account_id text;

-- Add preferred payout method field
ALTER TABLE public.profiles_private ADD COLUMN IF NOT EXISTS preferred_payout_method text DEFAULT 'paypal';
