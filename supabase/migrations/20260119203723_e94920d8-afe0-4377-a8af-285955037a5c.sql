-- Create sudoku_games table for both single and multiplayer games
CREATE TABLE public.sudoku_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_1 UUID NOT NULL,
  player_2 UUID,
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  player_1_state JSONB,
  player_2_state JSONB,
  player_1_time INTEGER,
  player_2_time INTEGER,
  player_1_hints_used INTEGER DEFAULT 0,
  player_2_hints_used INTEGER DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  status TEXT NOT NULL DEFAULT 'active',
  winner UUID,
  is_multiplayer BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sudoku_games_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  CONSTRAINT sudoku_games_status_check CHECK (status IN ('pending', 'active', 'completed', 'declined'))
);

-- Create sudoku_stats table for tracking personal bests
CREATE TABLE public.sudoku_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  easy_best_time INTEGER,
  medium_best_time INTEGER,
  hard_best_time INTEGER,
  expert_best_time INTEGER,
  easy_games_won INTEGER DEFAULT 0,
  medium_games_won INTEGER DEFAULT 0,
  hard_games_won INTEGER DEFAULT 0,
  expert_games_won INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  multiplayer_wins INTEGER DEFAULT 0,
  multiplayer_losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sudoku_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sudoku_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for sudoku_games
CREATE POLICY "Users can view their own games"
ON public.sudoku_games
FOR SELECT
USING (auth.uid() = player_1 OR auth.uid() = player_2);

CREATE POLICY "Users can create games"
ON public.sudoku_games
FOR INSERT
WITH CHECK (auth.uid() = player_1);

CREATE POLICY "Players can update their games"
ON public.sudoku_games
FOR UPDATE
USING (auth.uid() = player_1 OR auth.uid() = player_2);

CREATE POLICY "Players can delete their games"
ON public.sudoku_games
FOR DELETE
USING (auth.uid() = player_1);

-- RLS policies for sudoku_stats
CREATE POLICY "Users can view their own stats"
ON public.sudoku_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stats"
ON public.sudoku_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.sudoku_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sudoku_games_updated_at
BEFORE UPDATE ON public.sudoku_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sudoku_stats_updated_at
BEFORE UPDATE ON public.sudoku_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for multiplayer
ALTER PUBLICATION supabase_realtime ADD TABLE public.sudoku_games;