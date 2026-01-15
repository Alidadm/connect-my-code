-- Add column to track if user has completed payout setup
ALTER TABLE public.profiles_private 
ADD COLUMN IF NOT EXISTS payout_setup_completed boolean DEFAULT false;