
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "Service can create notifications" ON public.notifications;

-- Only authenticated users or service role can create notifications
CREATE POLICY "Authenticated can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
