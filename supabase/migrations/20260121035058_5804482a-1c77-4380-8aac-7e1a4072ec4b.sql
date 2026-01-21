-- Drop the conflicting RLS policies that block all operations
DROP POLICY IF EXISTS "No client insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "No client update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "No client delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "No direct client access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;

-- Create proper RLS policies
-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- No direct client INSERT/UPDATE/DELETE - all managed via service role in webhooks
-- Service role bypasses RLS, so these "deny all" policies only affect anonymous/authenticated roles
CREATE POLICY "Deny client insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
TO authenticated, anon
USING (false);

CREATE POLICY "Deny client delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
TO authenticated, anon
USING (false);