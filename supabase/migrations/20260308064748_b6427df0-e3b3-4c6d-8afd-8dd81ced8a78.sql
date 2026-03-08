
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  feature text NOT NULL,
  model text,
  tokens_used integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  status text DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI logs"
  ON public.ai_usage_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert AI logs"
  ON public.ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider ON public.ai_usage_logs (provider);
CREATE INDEX idx_ai_usage_logs_feature ON public.ai_usage_logs (feature);
