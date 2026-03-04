
-- Create deals table
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  coupon_code text,
  discount_type text DEFAULT 'percentage',
  discount_value numeric,
  deal_url text,
  original_price numeric,
  deal_price numeric,
  currency text DEFAULT 'USD',
  starts_at timestamptz,
  expires_at timestamptz,
  is_verified boolean DEFAULT false,
  is_exclusive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Public can view active deals
CREATE POLICY "Active deals viewable by everyone"
  ON public.deals FOR SELECT
  USING (is_active = true);

-- Admin can manage all deals
CREATE POLICY "Admins can manage deals"
  ON public.deals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
