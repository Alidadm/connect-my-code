-- Create memory match games table
CREATE TABLE public.memory_match_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_1 UUID NOT NULL,
  player_2 UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  current_turn UUID NOT NULL,
  cards TEXT[] NOT NULL DEFAULT '{}',
  revealed TEXT[] NOT NULL DEFAULT '{}',
  matched TEXT[] NOT NULL DEFAULT '{}',
  player_1_score INTEGER NOT NULL DEFAULT 0,
  player_2_score INTEGER NOT NULL DEFAULT 0,
  winner UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.memory_match_games ENABLE ROW LEVEL SECURITY;

-- Create policies for memory match games
CREATE POLICY "Users can view their own games" 
ON public.memory_match_games 
FOR SELECT 
USING (auth.uid() = player_1 OR auth.uid() = player_2);

CREATE POLICY "Users can create games" 
ON public.memory_match_games 
FOR INSERT 
WITH CHECK (auth.uid() = player_1);

CREATE POLICY "Players can update their games" 
ON public.memory_match_games 
FOR UPDATE 
USING (auth.uid() = player_1 OR auth.uid() = player_2);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_match_games;

-- Create trigger for updated_at
CREATE TRIGGER update_memory_match_games_updated_at
BEFORE UPDATE ON public.memory_match_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();