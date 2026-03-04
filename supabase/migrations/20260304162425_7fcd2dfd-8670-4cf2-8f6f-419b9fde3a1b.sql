
-- 1. search_logs table
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  normalized_query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  source text DEFAULT 'hero',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. search_rules table
CREATE TABLE public.search_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_pattern text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains',
  pinned_tool_ids uuid[] DEFAULT '{}',
  boost_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  redirect_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS for search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search logs"
ON public.search_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view search logs"
ON public.search_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete search logs"
ON public.search_logs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. RLS for search_rules
ALTER TABLE public.search_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage search rules"
ON public.search_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Search rules readable by service role"
ON public.search_rules FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 5. Index for fast aggregation
CREATE INDEX idx_search_logs_normalized ON public.search_logs(normalized_query);
CREATE INDEX idx_search_logs_created ON public.search_logs(created_at);

-- 6. Enable realtime for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.search_logs;
