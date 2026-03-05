
-- 1. site_settings table
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. newsletter_subscribers table
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  subscribed_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage reports" ON public.reports FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
