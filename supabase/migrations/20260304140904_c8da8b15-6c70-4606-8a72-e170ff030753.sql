
CREATE TABLE public.collect_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  search_type text NOT NULL DEFAULT 'keyword',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  cron_expression text NOT NULL DEFAULT '0 8 * * 1',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_session_id uuid REFERENCES public.collect_sessions(id) ON DELETE SET NULL,
  results_total integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collect_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage schedules" ON public.collect_schedules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_collect_schedules_updated_at
  BEFORE UPDATE ON public.collect_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
