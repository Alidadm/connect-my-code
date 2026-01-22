-- Add terms acceptance tracking column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;