-- Create tic_tac_toe_games table
CREATE TABLE public.tic_tac_toe_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_x UUID NOT NULL,
  player_o UUID,
  board TEXT[] NOT NULL DEFAULT ARRAY['','','','','','','','',''],
  current_turn TEXT NOT NULL DEFAULT 'x',
  status TEXT NOT NULL DEFAULT 'pending',
  winner UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'draw', 'declined')),
  CONSTRAINT valid_turn CHECK (current_turn IN ('x', 'o'))
);

-- Enable RLS
ALTER TABLE public.tic_tac_toe_games ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view their own games
CREATE POLICY "Players can view their games"
ON public.tic_tac_toe_games
FOR SELECT
USING (auth.uid() = player_x OR auth.uid() = player_o);

-- Policy: Authenticated users can create games
CREATE POLICY "Users can create games"
ON public.tic_tac_toe_games
FOR INSERT
WITH CHECK (auth.uid() = player_x);

-- Policy: Players can update their games (for making moves)
CREATE POLICY "Players can update their games"
ON public.tic_tac_toe_games
FOR UPDATE
USING (auth.uid() = player_x OR auth.uid() = player_o);

-- Add trigger for updated_at
CREATE TRIGGER update_tic_tac_toe_games_updated_at
BEFORE UPDATE ON public.tic_tac_toe_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tic_tac_toe_games;