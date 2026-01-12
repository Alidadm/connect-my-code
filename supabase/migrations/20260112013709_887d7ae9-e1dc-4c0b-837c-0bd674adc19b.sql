-- Generate usernames for existing users who don't have one
-- Using first_name.last_name format, with numbers added if needed

-- First, create a function to generate unique usernames
CREATE OR REPLACE FUNCTION public.generate_unique_username(
  p_first_name TEXT,
  p_last_name TEXT,
  p_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
  counter INT := 0;
BEGIN
  -- Clean and lowercase the names
  base_username := LOWER(
    REGEXP_REPLACE(COALESCE(p_first_name, 'user'), '[^a-z0-9]', '', 'g') || 
    '.' || 
    REGEXP_REPLACE(COALESCE(p_last_name, 'name'), '[^a-z0-9]', '', 'g')
  );
  
  -- Ensure minimum 5 characters
  IF LENGTH(base_username) < 5 THEN
    base_username := base_username || FLOOR(RANDOM() * 1000)::TEXT;
  END IF;
  
  -- Try base username first
  candidate := base_username;
  
  -- Keep trying with incrementing numbers until we find a unique one
  WHILE EXISTS (
    SELECT 1 FROM profiles 
    WHERE username = candidate AND user_id != p_user_id
  ) LOOP
    counter := counter + 1;
    candidate := base_username || counter::TEXT;
  END LOOP;
  
  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now update all profiles that don't have a username
UPDATE profiles
SET username = generate_unique_username(first_name, last_name, user_id)
WHERE username IS NULL;