
-- Create trigger function to notify followers when a new deal is created
CREATE OR REPLACE FUNCTION public.notify_deal_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower RECORD;
  tool_name TEXT;
BEGIN
  -- Get tool name
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  
  -- Notify all followers of this tool
  FOR follower IN
    SELECT user_id FROM public.follows
    WHERE target_type = 'tool' AND target_id = NEW.tool_id::text
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      follower.user_id,
      'deal',
      '🏷️ Ưu đãi mới cho ' || COALESCE(tool_name, 'tool'),
      NEW.title,
      '/tool/' || (SELECT slug FROM public.tools WHERE id = NEW.tool_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to deals table
CREATE TRIGGER on_deal_created
  AFTER INSERT ON public.deals
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION notify_deal_followers();
