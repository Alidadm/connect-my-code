-- Step 1: Drop the dependent policy first
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS public.are_friends(uuid, uuid);

-- Step 3: Recreate the function WITHOUT SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b)
      OR (requester_id = user_b AND addressee_id = user_a)
    )
  );
$$;

-- Step 4: Recreate the policy using the new function
CREATE POLICY "Users can view friend profiles"
ON public.profiles
FOR SELECT
USING (
  public.are_friends(auth.uid(), user_id)
);