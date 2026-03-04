
-- 1. Add structured review fields to reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS ease_of_use smallint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_support smallint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS value_for_money smallint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS likelihood_to_recommend smallint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pros text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cons text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_case text DEFAULT NULL;

-- 2. Create tool_screenshots table
CREATE TABLE IF NOT EXISTS public.tool_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Screenshots viewable by everyone" ON public.tool_screenshots
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage screenshots" ON public.tool_screenshots
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create tool_alternatives table
CREATE TABLE IF NOT EXISTS public.tool_alternatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  alternative_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tool_id, alternative_id),
  CHECK (tool_id != alternative_id)
);

ALTER TABLE public.tool_alternatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alternatives viewable by everyone" ON public.tool_alternatives
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage alternatives" ON public.tool_alternatives
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert alternatives" ON public.tool_alternatives
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
