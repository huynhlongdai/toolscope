-- Fix 2 more missing FKs of the same pattern found during Tool Detail page
-- verification (see 20260903135900_fix_vendor_responses_vendor_id_fk.sql for
-- the original bug: PostgREST embedded select `profiles:*_id(...)` needs an
-- actual FK constraint to resolve, otherwise it returns HTTP 400 PGRST200).
--
-- These two were out of scope for the Tool Detail page (Launches module is
-- disabled by default; Reports is an Admin-only page), but are fixed here
-- proactively now that the pattern is understood, to prevent the same class
-- of bug from surfacing later once those features are used/enabled.

ALTER TABLE public.launch_comments
  ADD CONSTRAINT launch_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
