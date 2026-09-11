-- P0 follow-up: extend the agent-safe editor model to a second wave of
-- admin resources (categories/tags/tasks/pages/menus/reports/newsletter),
-- per explicit user scope: "triển khai đầy đủ [everything I proposed],
-- users/settings/backup KHÔNG cho agent chạm tới" (users/settings/backup
-- stay 100% admin-only, no exceptions).
--
-- IMPORTANT ARCHITECTURE NOTE (discovered while designing this migration):
-- agent-content-api (and every requireAuth/requireEditor* helper in
-- _shared/auth.ts) resolves to a SERVICE-ROLE Supabase client, not the
-- caller's own JWT client. That means RLS is NOT the enforcement layer
-- for the AI agent path (sk_agent_... tokens can only ever be used through
-- edge functions that already run as service-role) - the edge function's
-- own application logic is the sole gate there, same as it always was for
-- blog_posts/tools/deals. RLS "editor" grants matter for a DIFFERENT
-- scenario: a human account with the `editor` role logging into the SPA
-- directly and calling supabase.from(...) with their own session (e.g.
-- AdminCategories.tsx, AdminDeals.tsx) - those pages have NO role-gating
-- of their own (only route-level "is staff" auth), so RLS is what keeps a
-- human editor account safe on those screens.
--
-- Given that split, this migration is deliberately selective about WHERE
-- it adds RLS:
--   - categories/tags/tasks/pages: low-risk, taxonomy-like or already
--     status-gated resources where a human editor using the existing
--     Admin* screens directly is fine (mirrors the categories/tags
--     precedent from 20260906040000). RLS grants added here.
--   - menus/newsletter: HIGH risk if exposed to the existing Admin* SPA
--     screens as-is, because those screens have no draft/review concept
--     at all (AdminMenus.tsx writes `items` = live nav instantly;
--     AdminNewsletter.tsx has full subscriber PII + a "Send" button) and
--     were never audited for editor-safety. Deliberately NOT adding any
--     RLS grant for editor here - agent access to these will be entirely
--     mediated by new agent-content-api actions (service-role, narrow,
--     newly-written logic), so a human `editor` account gets ZERO new
--     capability on menus/newsletter through the SPA. Only a schema
--     change (menus.draft_items) is added to support this.
--   - reports (moderation signal only): existing RLS ("Authenticated
--     users can submit reports" / "Users can view own reports") already
--     covers exactly what the agent needs (create + list own) - no change
--     needed.
--   - moderation (approve/reject content, ban users): explicitly NOT
--     exposed to the agent at all in this migration or in agent-content-
--     api. Approving/rejecting OTHER users' content and banning accounts
--     is a different trust boundary than "manage my own draft", and
--     touches user-account state the way `users` (explicitly excluded)
--     does. No schema change.
--   - users/settings/backup: untouched, as required.

BEGIN;

-- 1. tags: editor already has INSERT (20260906040000). Add UPDATE for
--    parity with categories (same migration gave categories both).
CREATE POLICY "Editors can update tags"
ON public.tags FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

-- 2. tasks: no editor RLS existed at all. tasks are structurally
--    identical to categories (simple taxonomy, "viewable by everyone",
--    no draft/live concept) - extend the same editor insert+update grant
--    admins already have unrestricted (has_role admin ALL policy,
--    unchanged).
CREATE POLICY "Editors can insert tasks"
ON public.tasks FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editors can update tasks"
ON public.tasks FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

-- 3. pages: add an owner column (the table had none - unlike
--    tools.submitted_by / blog_posts.author_id, so an editor's own pages
--    couldn't be scoped without this) plus review-tracking columns for
--    parity with tools/blog_posts, then the same
--    "editor can insert/update only while non-published" policy pair
--    already used for tools/blog_posts.
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE POLICY "Editors can insert non-published pages"
ON public.pages FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND status IN ('draft', 'pending_review')
);

CREATE POLICY "Editors can update non-published pages"
ON public.pages FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND status IN ('draft', 'pending_review')
);

-- Extend the existing publish_content() RPC (20260906040000) to cover
-- pages too, so admin approval of an agent-drafted page goes through the
-- same single audited choke point as tools/blog_posts/workflows/deals
-- instead of a bespoke path.
CREATE OR REPLACE FUNCTION public.publish_content(
  _table text,
  _id uuid,
  _publish boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required to publish content';
  END IF;

  IF _table = 'tools' THEN
    UPDATE public.tools
    SET status = CASE WHEN _publish THEN 'published'::content_status ELSE 'draft'::content_status END,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _id;
  ELSIF _table = 'blog_posts' THEN
    UPDATE public.blog_posts
    SET status = CASE WHEN _publish THEN 'published'::content_status ELSE 'draft'::content_status END,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _id;
  ELSIF _table = 'workflows' THEN
    UPDATE public.workflows
    SET status = CASE WHEN _publish THEN 'published'::content_status ELSE 'draft'::content_status END,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _id;
  ELSIF _table = 'deals' THEN
    UPDATE public.deals
    SET is_active = _publish
    WHERE id = _id;
  ELSIF _table = 'pages' THEN
    UPDATE public.pages
    SET status = CASE WHEN _publish THEN 'published'::content_status ELSE 'draft'::content_status END,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', _table;
  END IF;
END;
$$;

-- 4. menus: schema-only change. `draft_items` holds an agent/editor's
--    proposed nav structure; the LIVE `items` column is only ever written
--    by an admin (still 100% RLS-gated to admin, unchanged). No RLS grant
--    added for editor - see note at top of file. agent-content-api is the
--    only way anything other than an admin can populate draft_items, and
--    it never touches `items` for a non-admin caller.
ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS draft_items jsonb,
  ADD COLUMN IF NOT EXISTS draft_updated_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz;

-- publish_menu(): the ONLY way draft_items copies into the live `items`
-- column. SECURITY DEFINER + explicit admin check, same choke-point
-- pattern as publish_content()/verify_deal(). Creates the row (with
-- empty live items) if it doesn't exist yet, so an agent can "propose"
-- a brand-new header/footer menu before it has ever been saved once.
CREATE OR REPLACE FUNCTION public.publish_menu(_location text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required to publish a menu';
  END IF;

  SELECT id, draft_items INTO _existing FROM public.menus WHERE location = _location;

  IF _existing.id IS NULL THEN
    RAISE EXCEPTION 'No menu row found for location: %', _location;
  END IF;
  IF _existing.draft_items IS NULL THEN
    RAISE EXCEPTION 'No draft to publish for location: %', _location;
  END IF;

  UPDATE public.menus
  SET items = _existing.draft_items,
      updated_at = now()
  WHERE location = _location;
END;
$$;

COMMIT;
