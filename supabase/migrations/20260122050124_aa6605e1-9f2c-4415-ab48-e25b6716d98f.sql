-- Create user_presence table to track online status and last seen
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone can read presence status (for showing online indicators)
CREATE POLICY "Anyone can view user presence"
ON public.user_presence
FOR SELECT
USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own presence
CREATE POLICY "Users can insert their own presence"
ON public.user_presence
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX idx_user_presence_is_online ON public.user_presence(is_online);

-- Add trigger for updated_at
CREATE TRIGGER update_user_presence_updated_at
BEFORE UPDATE ON public.user_presence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for presence updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;