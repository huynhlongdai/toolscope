-- Fix missing FKs so PostgREST can resolve embedded `profiles:*_id(...)` selects.
-- Without these FKs, PostgREST returns HTTP 400 (PGRST200) "Could not find a
-- relationship" on every Tool Detail page load (VendorResponse is rendered
-- per review; VendorClaimBadge/Button are rendered once per tool page).

ALTER TABLE public.vendor_responses
  ADD CONSTRAINT vendor_responses_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_claims
  ADD CONSTRAINT vendor_claims_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
