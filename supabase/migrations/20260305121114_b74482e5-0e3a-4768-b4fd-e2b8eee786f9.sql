
-- Vendor Claims table
CREATE TABLE public.vendor_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, user_id)
);

ALTER TABLE public.vendor_claims ENABLE ROW LEVEL SECURITY;

-- Everyone can see approved claims
CREATE POLICY "Approved claims viewable" ON public.vendor_claims
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Users can submit claims
CREATE POLICY "Users can submit claims" ON public.vendor_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own pending claims
CREATE POLICY "Users can update own claims" ON public.vendor_claims
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete claims
CREATE POLICY "Admins can delete claims" ON public.vendor_claims
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Vendor responses to reviews
CREATE TABLE public.vendor_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(review_id)
);

ALTER TABLE public.vendor_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor responses viewable" ON public.vendor_responses
  FOR SELECT USING (true);

CREATE POLICY "Vendors can respond" ON public.vendor_responses
  FOR INSERT WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own responses" ON public.vendor_responses
  FOR UPDATE USING (auth.uid() = vendor_id);

CREATE POLICY "Admins can delete responses" ON public.vendor_responses
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
