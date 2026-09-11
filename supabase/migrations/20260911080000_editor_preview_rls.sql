-- Content Preview feature: allow admin/editor to SELECT non-published
-- (draft/pending_review) rows on pages/workflows/deals so the public-facing
-- detail pages can render a real "Preview" view for content that isn't
-- live yet, instead of the current 404/"not found" behavior.
--
-- CONTEXT: blog_posts and tools already grant this via their original SELECT
-- policy ("... OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'editor')").
-- pages/workflows only had "... OR admin" (no editor), and deals had NO
-- admin/editor carve-out at all on its SELECT policy (only
-- "Active deals viewable by everyone" USING (is_active = true)) - meaning
-- an editor opening AdminDeals.tsx today can only ever see is_active=true
-- rows, and there is no way to preview a freshly-created inactive deal.
--
-- This migration brings pages/workflows/deals SELECT policies in line with
-- the existing blog_posts/tools pattern. No behavior change for anonymous
-- visitors (they still only see published/active rows); no change for the
-- agent-token path either (that path already reads through a service-role
-- client per _shared/auth.ts, bypassing RLS entirely).

BEGIN;

-- pages ----------------------------------------------------------------
DROP POLICY IF EXISTS "Published pages viewable by everyone" ON public.pages;
CREATE POLICY "Published pages viewable by everyone"
ON public.pages FOR SELECT
USING (
  status = 'published'::public.content_status
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
);

-- workflows --------------------------------------------------------------
DROP POLICY IF EXISTS "Published workflows viewable by everyone" ON public.workflows;
CREATE POLICY "Published workflows viewable by everyone"
ON public.workflows FOR SELECT
USING (
  status = 'published'
  OR auth.uid() = author_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

-- deals --------------------------------------------------------------------
DROP POLICY IF EXISTS "Active deals viewable by everyone" ON public.deals;
CREATE POLICY "Active deals viewable by everyone"
ON public.deals FOR SELECT
USING (
  is_active = true
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
);

COMMIT;
