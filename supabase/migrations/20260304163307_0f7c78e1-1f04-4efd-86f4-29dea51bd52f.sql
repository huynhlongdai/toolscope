
-- Create increment_deal_click function
CREATE OR REPLACE FUNCTION public.increment_deal_click(deal_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.deals SET click_count = click_count + 1 WHERE id = deal_id;
$$;
