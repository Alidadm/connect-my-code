-- Update messages INSERT policy to require friendship between sender and receiver
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users can send messages to friends"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.are_friends(auth.uid(), receiver_id)
);