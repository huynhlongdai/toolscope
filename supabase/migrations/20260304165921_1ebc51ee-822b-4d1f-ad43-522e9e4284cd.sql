
-- Auto-create pricing_history when a new tool is inserted
CREATE OR REPLACE FUNCTION public.auto_create_pricing_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pricing_history (tool_id, pricing_type, plan_name, recorded_at)
  VALUES (NEW.id, NEW.pricing_type, 'Initial', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tool_created_pricing
  AFTER INSERT ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_pricing_history();

-- Backfill: create pricing_history for tools that don't have any
INSERT INTO public.pricing_history (tool_id, pricing_type, plan_name, recorded_at)
SELECT t.id, t.pricing_type, 'Initial', t.created_at
FROM public.tools t
WHERE NOT EXISTS (
  SELECT 1 FROM public.pricing_history ph WHERE ph.tool_id = t.id
);
