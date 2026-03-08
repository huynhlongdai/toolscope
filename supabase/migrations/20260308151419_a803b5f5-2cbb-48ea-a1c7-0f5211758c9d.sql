
-- Bảng đăng ký nhận thông báo launch
CREATE TABLE public.launch_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id uuid NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(launch_id, user_id),
  UNIQUE(launch_id, email)
);

-- Bảng comments cho launches
CREATE TABLE public.launch_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id uuid NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.launch_comments(id),
  content text NOT NULL,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Thêm cột mới vào launches
ALTER TABLE public.launches 
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_url text,
  ADD COLUMN IF NOT EXISTS subscriber_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_coming_soon boolean DEFAULT false;

-- RLS
ALTER TABLE public.launch_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_comments ENABLE ROW LEVEL SECURITY;

-- launch_subscribers policies
CREATE POLICY "Users can subscribe" ON public.launch_subscribers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsubscribe" ON public.launch_subscribers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscribers" ON public.launch_subscribers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Subscriber counts viewable" ON public.launch_subscribers FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- launch_comments policies
CREATE POLICY "Comments viewable by all" ON public.launch_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.launch_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own" ON public.launch_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users or admins can delete" ON public.launch_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime cho launch_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.launch_comments;
