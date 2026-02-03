-- Create Tetris high scores table
CREATE TABLE public.tetris_high_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  lines_cleared INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'normal',
  game_mode TEXT NOT NULL DEFAULT 'solo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Tetris stats table for aggregate stats
CREATE TABLE public.tetris_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_level INTEGER NOT NULL DEFAULT 0,
  total_lines_cleared INTEGER NOT NULL DEFAULT 0,
  ai_wins INTEGER NOT NULL DEFAULT 0,
  ai_losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tetris_high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tetris_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for tetris_high_scores
CREATE POLICY "Anyone can view high scores"
  ON public.tetris_high_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own high scores"
  ON public.tetris_high_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own high scores"
  ON public.tetris_high_scores FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for tetris_stats
CREATE POLICY "Anyone can view tetris stats"
  ON public.tetris_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.tetris_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.tetris_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update tetris stats
CREATE OR REPLACE FUNCTION public.update_tetris_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tetris_stats (user_id, games_played, total_score, best_score, best_level, total_lines_cleared)
  VALUES (
    NEW.user_id,
    1,
    NEW.score,
    NEW.score,
    NEW.level,
    NEW.lines_cleared
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    games_played = tetris_stats.games_played + 1,
    total_score = tetris_stats.total_score + NEW.score,
    best_score = GREATEST(tetris_stats.best_score, NEW.score),
    best_level = GREATEST(tetris_stats.best_level, NEW.level),
    total_lines_cleared = tetris_stats.total_lines_cleared + NEW.lines_cleared,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update stats on new high score
CREATE TRIGGER on_tetris_score_insert
  AFTER INSERT ON public.tetris_high_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tetris_stats();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tetris_high_scores;