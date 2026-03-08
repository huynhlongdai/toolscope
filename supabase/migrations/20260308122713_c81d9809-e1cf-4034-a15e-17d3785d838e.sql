
CREATE TABLE public.deal_collect_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  source_url text,
  tool_name text,
  tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  coupon_code text,
  discount_type text DEFAULT 'percentage',
  discount_value numeric,
  deal_url text,
  original_price numeric,
  deal_price numeric,
  currency text DEFAULT 'USD',
  expires_at timestamptz,
  status text DEFAULT 'pending',
  imported_deal_id uuid,
  collected_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.deal_collect_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deal collect items" ON public.deal_collect_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view deal collect items" ON public.deal_collect_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'editor'));
