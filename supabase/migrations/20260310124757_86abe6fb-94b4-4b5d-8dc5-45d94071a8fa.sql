
-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_deals boolean NOT NULL DEFAULT true,
  notify_new_tools boolean NOT NULL DEFAULT true,
  notify_reviews boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_follows boolean NOT NULL DEFAULT true,
  notify_launches boolean NOT NULL DEFAULT true,
  notify_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view own preferences
CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update own preferences
CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own preferences
CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update handle_new_user to auto-create preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Update notify_deal_followers to check preferences
CREATE OR REPLACE FUNCTION public.notify_deal_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower RECORD;
  tool_name TEXT;
  tool_slug TEXT;
  pref_enabled BOOLEAN;
BEGIN
  SELECT name, slug INTO tool_name, tool_slug FROM public.tools WHERE id = NEW.tool_id;
  
  FOR follower IN
    SELECT user_id FROM public.follows
    WHERE target_type = 'tool' AND target_id = NEW.tool_id
  LOOP
    -- Check notification preference
    SELECT COALESCE(np.notify_deals, true) INTO pref_enabled
    FROM public.notification_preferences np WHERE np.user_id = follower.user_id;
    
    IF COALESCE(pref_enabled, true) THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        follower.user_id,
        'deal',
        '🏷️ Ưu đãi mới cho ' || COALESCE(tool_name, 'tool'),
        NEW.title,
        '/tool/' || COALESCE(tool_slug, '')
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;
