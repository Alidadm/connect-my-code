-- Add explicit restrictive policies to prevent client-side modifications
-- Service role bypasses RLS, so stripe-webhook can still update subscriptions

-- Explicitly deny all client UPDATE operations
CREATE POLICY "No client update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (false);

-- Explicitly deny all client DELETE operations  
CREATE POLICY "No client delete subscriptions"
ON public.subscriptions
FOR DELETE
USING (false);

-- Explicitly deny all client INSERT operations (only stripe-webhook should create)
CREATE POLICY "No client insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (false);