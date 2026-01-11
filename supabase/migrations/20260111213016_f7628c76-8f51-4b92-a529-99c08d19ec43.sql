-- Create a function to sync email from auth.users to profiles (for admin use)
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user signs up, copy their email to the profiles table
  UPDATE public.profiles 
  SET email = NEW.email
  WHERE user_id = NEW.id AND (email IS NULL OR email = '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update existing profiles with email from auth.users (one-time sync)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email = '');

-- Parse display_name into first_name and last_name for existing profiles
UPDATE public.profiles
SET 
  first_name = CASE 
    WHEN display_name IS NOT NULL AND display_name != '' 
    THEN split_part(display_name, ' ', 1)
    ELSE NULL
  END,
  last_name = CASE 
    WHEN display_name IS NOT NULL AND display_name != '' AND position(' ' in display_name) > 0
    THEN substring(display_name from position(' ' in display_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;