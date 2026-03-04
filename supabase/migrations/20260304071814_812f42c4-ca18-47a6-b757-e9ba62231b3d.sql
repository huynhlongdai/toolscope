
-- Pricing history table to track tool price changes over time
CREATE TABLE public.pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  pricing_type public.pricing_type NOT NULL,
  price_amount numeric,
  currency text DEFAULT 'USD',
  plan_name text,
  details jsonb,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view pricing history
CREATE POLICY "Pricing history viewable by everyone"
ON public.pricing_history FOR SELECT
USING (true);

-- Admins/editors can manage pricing history
CREATE POLICY "Admins can manage pricing history"
ON public.pricing_history FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Index for fast lookups
CREATE INDEX idx_pricing_history_tool_id ON public.pricing_history(tool_id);
CREATE INDEX idx_pricing_history_recorded_at ON public.pricing_history(recorded_at);
