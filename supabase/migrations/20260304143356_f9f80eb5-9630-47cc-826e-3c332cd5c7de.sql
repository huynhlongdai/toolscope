
-- Translations table for i18n
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'tool', 'category', 'blog_post', 'page'
  entity_id uuid NOT NULL,
  locale text NOT NULL DEFAULT 'en', -- 'vi', 'en', etc.
  field_name text NOT NULL, -- 'name', 'description', 'content', etc.
  translated_text text NOT NULL,
  is_auto boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, locale, field_name)
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations viewable by everyone" ON public.translations FOR SELECT USING (true);
CREATE POLICY "Admins can manage translations" ON public.translations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Workflows/Use Cases table
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover_image_url text,
  steps jsonb DEFAULT '[]'::jsonb,
  tool_ids uuid[] DEFAULT '{}'::uuid[],
  category text,
  author_id uuid REFERENCES public.profiles(id),
  upvotes integer DEFAULT 0,
  view_count integer DEFAULT 0,
  status content_status DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published workflows viewable by everyone" ON public.workflows FOR SELECT USING (status = 'published' OR auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create workflows" ON public.workflows FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own workflows" ON public.workflows FOR UPDATE USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete workflows" ON public.workflows FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- User badges table for gamification
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type text NOT NULL, -- 'top_reviewer', 'early_adopter', 'expert', 'helpful'
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can manage badges" ON public.user_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
