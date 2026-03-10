
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  tables_synced text[] NOT NULL DEFAULT '{}',
  rows_pushed integer DEFAULT 0,
  rows_pulled integer DEFAULT 0,
  conflicts integer DEFAULT 0,
  status text DEFAULT 'running',
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync logs" ON public.sync_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert sync logs" ON public.sync_logs
  FOR INSERT TO service_role
  WITH CHECK (true);
