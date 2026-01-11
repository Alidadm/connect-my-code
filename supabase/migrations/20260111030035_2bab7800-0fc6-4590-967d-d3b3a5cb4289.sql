-- Add IP address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS signup_ip_address TEXT;