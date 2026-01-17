-- Add difficulty column to memory_match_games table
ALTER TABLE public.memory_match_games 
ADD COLUMN difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));