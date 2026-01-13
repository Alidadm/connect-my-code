-- Create a secure view for user-facing subscription details
-- This hides internal provider IDs while showing necessary subscription info

CREATE OR REPLACE VIEW public.user_subscriptions 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  status,
  amount,
  currency,
  current_period_start,
  current_period_end,
  canceled_at,
  created_at,
  updated_at
FROM public.subscriptions
WHERE auth.uid() = user_id;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.user_subscriptions IS 'Secure view exposing only user-facing subscription details without internal payment provider IDs';

-- Drop the existing SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

-- Create a deny-all SELECT policy on the subscriptions table
-- (users should query through the user_subscriptions view instead)
CREATE POLICY "No direct client access to subscriptions"
ON public.subscriptions
FOR SELECT
USING (false);