-- Fix the username generation function - apply LOWER first, then clean
CREATE OR REPLACE FUNCTION public.generate_unique_username(
  p_first_name TEXT,
  p_last_name TEXT,
  p_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  clean_first TEXT;
  clean_last TEXT;
  base_username TEXT;
  candidate TEXT;
  counter INT := 0;
BEGIN
  -- Lowercase first, then remove non-alphanumeric
  clean_first := REGEXP_REPLACE(LOWER(COALESCE(p_first_name, 'user')), '[^a-z0-9]', '', 'g');
  clean_last := REGEXP_REPLACE(LOWER(COALESCE(p_last_name, 'name')), '[^a-z0-9]', '', 'g');
  
  -- Build base username
  base_username := clean_first || '.' || clean_last;
  
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

-- Re-generate usernames for all users to fix the broken ones
UPDATE profiles
SET username = generate_unique_username(first_name, last_name, user_id);