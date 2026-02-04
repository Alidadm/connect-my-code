-- Create penpal_requests table for connection request flow
CREATE TABLE public.penpal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

-- Create virtual_postcards table
CREATE TABLE public.virtual_postcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT 'classic',
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penpal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_postcards ENABLE ROW LEVEL SECURITY;

-- RLS policies for penpal_requests
CREATE POLICY "Users can view their own requests"
ON public.penpal_requests FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send requests"
ON public.penpal_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
ON public.penpal_requests FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
ON public.penpal_requests FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- RLS policies for virtual_postcards
CREATE POLICY "Users can view postcards they sent or received"
ON public.virtual_postcards FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send postcards to connected penpals"
ON public.virtual_postcards FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM penpal_connections 
    WHERE (user_id = auth.uid() AND penpal_id = receiver_id)
       OR (penpal_id = auth.uid() AND user_id = receiver_id)
  )
);

CREATE POLICY "Receivers can update postcards (mark read)"
ON public.virtual_postcards FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

-- Add indexes for performance
CREATE INDEX idx_penpal_requests_sender ON public.penpal_requests(sender_id);
CREATE INDEX idx_penpal_requests_receiver ON public.penpal_requests(receiver_id);
CREATE INDEX idx_penpal_requests_status ON public.penpal_requests(status);
CREATE INDEX idx_virtual_postcards_receiver ON public.virtual_postcards(receiver_id);
CREATE INDEX idx_virtual_postcards_sender ON public.virtual_postcards(sender_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.penpal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_postcards;