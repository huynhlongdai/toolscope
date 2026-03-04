
-- Thêm cột vào tools
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS related_tool_ids uuid[] DEFAULT '{}';

-- Thêm cột ban user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Admin can update profiles (for ban)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Bảng menus
CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menus viewable by everyone" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Admins can manage menus" ON public.menus FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Bảng pages
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]',
  seo_title text,
  seo_description text,
  status public.content_status DEFAULT 'draft',
  template text DEFAULT 'blank',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published pages viewable by everyone" ON public.pages FOR SELECT USING (status = 'published'::public.content_status OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Bảng page_templates
CREATE TABLE public.page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  blocks jsonb NOT NULL DEFAULT '[]',
  category text
);
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by everyone" ON public.page_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.page_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
