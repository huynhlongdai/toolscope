
CREATE OR REPLACE FUNCTION public.notify_deal_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower RECORD;
  tool_name TEXT;
  tool_slug TEXT;
BEGIN
  SELECT name, slug INTO tool_name, tool_slug FROM public.tools WHERE id = NEW.tool_id;
  
  FOR follower IN
    SELECT user_id FROM public.follows
    WHERE target_type = 'tool' AND target_id = NEW.tool_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      follower.user_id,
      'deal',
      '🏷️ Ưu đãi mới cho ' || COALESCE(tool_name, 'tool'),
      NEW.title,
      '/tool/' || COALESCE(tool_slug, '')
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;
