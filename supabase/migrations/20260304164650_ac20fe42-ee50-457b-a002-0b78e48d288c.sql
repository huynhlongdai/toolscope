
-- Function to auto-deactivate expired deals
CREATE OR REPLACE FUNCTION public.auto_deactivate_expired_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On any deal update or insert, check if expires_at has passed
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on INSERT and UPDATE
CREATE TRIGGER check_deal_expiry
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_deactivate_expired_deals();

-- Also deactivate all currently expired deals
UPDATE public.deals SET is_active = false WHERE expires_at < now() AND is_active = true;
