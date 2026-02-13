
-- Trigger function: notify on @mention in post comment
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
  mentioned_username TEXT;
  mentioned_user_id UUID;
  mention_pattern TEXT;
  post_owner UUID;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
  FROM profiles WHERE user_id = NEW.user_id;

  SELECT user_id INTO post_owner FROM posts WHERE id = NEW.post_id;

  -- Find all @mentions in the comment content
  FOR mentioned_username IN
    SELECT (regexp_matches(NEW.content, '@([\w.]+)', 'g'))[1]
  LOOP
    -- Look up the mentioned user
    SELECT user_id INTO mentioned_user_id
    FROM profiles 
    WHERE username = mentioned_username
    LIMIT 1;

    -- Don't notify self-mentions or if user not found
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, actor_id, reference_id, reference_type)
      VALUES (mentioned_user_id, 'mention', 'You were mentioned', actor_name || ' mentioned you in a comment', NEW.user_id, NEW.post_id, 'post');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_mention
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions();
