-- P0: Content-approval permission model for the "editor" role.
--
-- CONTEXT: this project wants to hand an "editor" account to an AI content
-- agent / outside collaborator to generate Tools/Blog/Workflows/Deals via
-- the CollectAI + generate-* edge functions, WITHOUT giving that account
-- the ability to (a) publish content live without human review, (b) touch
-- Settings/Backup/Danger Zone/API keys, or (c) change anyone's role
-- (including escalating themselves to admin). Today `editor` already has
-- near-identical DB write access to `admin` on `tools`/`blog_posts`, with
-- NO restriction on setting status = 'published' directly, and the SPA
-- does not gate Settings/Backup/Users pages by role at all (only route-level
-- auth, not role-level) - see AdminGuard.tsx / AdminLayout.tsx.
--
-- This migration:
--   1. Adds a new `viewer` value to `app_role` (read-only dashboards role,
--      for people who should see stats but never write anything).
--   2. Replaces the editor-facing INSERT/UPDATE policies on the 5 core
--      content tables (tools, blog_posts, workflows, deals, categories)
--      so that editors can create/edit rows freely EXCEPT they are
--      DB-level blocked from setting status = 'published' themselves.
--      Admins are unrestricted as before (has_role(..., 'admin') OR check
--      always short-circuits true).
--   3. Adds `reviewed_by` / `reviewed_at` columns to `tools` and
--      `blog_posts` so the UI can show "reviewed by <admin> at <time>"
--      once a piece of editor-authored content is approved/published.
--   4. Adds a `publish_content(...)` SECURITY DEFINER RPC that is the ONLY
--      admin-gated way to flip status to 'published' server-side (used by
--      the new "Publish" button so the client never needs a raw UPDATE
--      that RLS would reject for editors, and so we get one auditable
--      choke point instead of scattering `.update({status: 'published'})`
--      calls across 5 admin pages).
--
-- Existing rows are untouched. Existing admin behavior is unchanged.

BEGIN;

-- 1. New role value ---------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

COMMIT;

-- ADD VALUE cannot run inside the same transaction block as its later use
-- in a function/policy body on some PG versions - keep it in its own
-- transaction (already committed above) before referencing 'viewer' below.

BEGIN;

-- 2. tools: editors can INSERT/UPDATE but never set status='published' ------
DROP POLICY IF EXISTS "Admins/editors can manage tools" ON public.tools;

CREATE POLICY "Admins can manage tools"
ON public.tools FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can insert non-published tools"
ON public.tools FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND status IN ('draft', 'pending_review')
);

CREATE POLICY "Editors can update non-published tools"
ON public.tools FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND status IN ('draft', 'pending_review')
);

-- 3. blog_posts: same pattern -----------------------------------------------
DROP POLICY IF EXISTS "Editors and admins can create posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.blog_posts;

CREATE POLICY "Admins can create posts"
ON public.blog_posts FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can create non-published posts"
ON public.blog_posts FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND status IN ('draft', 'pending_review')
);

CREATE POLICY "Authors and admins can update posts"
ON public.blog_posts FOR UPDATE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (auth.uid() = author_id AND status IN ('draft', 'pending_review'))
);

-- 4. workflows: editors can create/update pending content -------------------
DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update own workflows" ON public.workflows;

CREATE POLICY "Users can create workflows"
ON public.workflows FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR status IS NULL
    OR status IN ('draft', 'pending_review')
  )
);

CREATE POLICY "Users can update own workflows"
ON public.workflows FOR UPDATE
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = author_id AND (status IS NULL OR status IN ('draft', 'pending_review')))
);

-- 5. deals: give editors write access (previously admin-only), gated the
--    same way as tools/blog_posts. `deals` doesn't have a content_status
--    column - it uses `is_active` boolean - so editors get insert/update
--    but new/edited deals are forced inactive until an admin flips them on.
DROP POLICY IF EXISTS "Admins can manage deals" ON public.deals;

CREATE POLICY "Admins can manage deals"
ON public.deals FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can insert inactive deals"
ON public.deals FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND is_active = false
);

CREATE POLICY "Editors can update deals keeping them inactive"
ON public.deals FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (
  public.has_role(auth.uid(), 'editor')
  AND is_active = false
);

-- 6. categories/tags: editors can propose new taxonomy entries (needed by
--    CollectAI / generate-tool-article auto-tagging), admins unrestricted.
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editors can update categories"
ON public.categories FOR UPDATE
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;

CREATE POLICY "Admins can manage tags"
ON public.tags FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can insert tags"
ON public.tags FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'editor'));

-- 7. Review-tracking columns --------------------------------------------------
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 8. publish_content(): the ONLY way to flip status -> 'published' ----------
-- SECURITY DEFINER + explicit admin check inside the function body (same
-- pattern as admin_list_users from the P2-1 migration) so RLS on the
-- underlying table doesn't need a separate "admin can always publish"
-- carve-out duplicated across every table - one audited choke point.
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
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', _table;
  END IF;
END;
$$;

-- 9. collect_sessions/collect_items: editors previously had SELECT-only
--    access ("Editors can view collect sessions/items"). The CollectAI UI
--    (src/components/admin/collect-ai/useCollectAI.ts) does client-side
--    `.update()` on collect_items to approve/reject staging rows and
--    `.delete()` to discard them - both would be silently rejected by RLS
--    for an editor today (no UPDATE/DELETE policy existed for that role),
--    even though editors could already trigger collect-ai's search/enrich
--    actions (which run under the service-role key inside the edge
--    function, bypassing RLS entirely). This closes that gap so an editor
--    can fully drive the CollectAI staging workflow end-to-end.
DROP POLICY IF EXISTS "Editors can view collect sessions" ON public.collect_sessions;
CREATE POLICY "Editors can manage collect sessions"
ON public.collect_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role));

DROP POLICY IF EXISTS "Editors can view collect items" ON public.collect_items;
CREATE POLICY "Editors can manage collect items"
ON public.collect_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role));

COMMIT;
