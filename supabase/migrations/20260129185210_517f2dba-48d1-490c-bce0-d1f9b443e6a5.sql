-- Add UPDATE policy for saved_sidebar_galleries (needed for upsert to work)
CREATE POLICY "Users can update their own saved galleries" 
ON public.saved_sidebar_galleries 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);