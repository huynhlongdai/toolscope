
-- Table for search/collect sessions history
CREATE TABLE public.collect_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_type text NOT NULL DEFAULT 'keyword', -- 'keyword' or 'url'
  query text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  results_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Table for collected/staged tool items
CREATE TABLE public.collect_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.collect_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  website_url text,
  description text,
  logo_url text,
  pricing_type text DEFAULT 'free',
  category_name text,
  source_url text,
  collected_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'imported'
  imported_tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.collect_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collect_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage collect sessions" ON public.collect_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view collect sessions" ON public.collect_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can manage collect items" ON public.collect_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view collect items" ON public.collect_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'editor'::app_role));

-- Update trigger
CREATE TRIGGER update_collect_items_updated_at
  BEFORE UPDATE ON public.collect_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
