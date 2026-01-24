-- Enable realtime for user_favorites table to support notifications when someone favorites you
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;