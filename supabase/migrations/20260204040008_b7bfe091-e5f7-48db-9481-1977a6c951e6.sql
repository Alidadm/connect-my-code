-- PenPal connections table (instant connect)
CREATE TABLE public.penpal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  penpal_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, penpal_id),
  CHECK (user_id != penpal_id)
);

-- PenPal preferences for discovery
CREATE TABLE public.penpal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_discoverable BOOLEAN DEFAULT true,
  preferred_countries TEXT[] DEFAULT '{}',
  looking_for_description TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penpal_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penpal_preferences ENABLE ROW LEVEL SECURITY;

-- PenPal connections policies
CREATE POLICY "Users can view their own connections" 
ON public.penpal_connections FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = penpal_id);

CREATE POLICY "Users can create connections" 
ON public.penpal_connections FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.penpal_connections FOR DELETE 
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = penpal_id);

-- PenPal preferences policies
CREATE POLICY "Users can view discoverable preferences" 
ON public.penpal_preferences FOR SELECT 
TO authenticated
USING (is_discoverable = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" 
ON public.penpal_preferences FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.penpal_preferences FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.penpal_connections;