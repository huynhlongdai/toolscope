-- Task 5 follow-up: the new agent-content-api edge function lets an
-- editor/AI-agent delete a post it authored, as long as it never reached
-- 'published' (the function itself enforces the status check, matching
-- the read-your-own-draft spirit of the 20260906040000 migration). Today
-- there is NO DELETE policy at all for editors on blog_posts - only
-- "Admins can delete posts" exists - so this would silently fail via RLS
-- even though the edge function's own check would have allowed it.
--
-- Scope deliberately narrow: author's own row AND status != 'published'.
-- Admins keep their existing unrestricted delete policy untouched.
BEGIN;

CREATE POLICY "Editors can delete own non-published posts"
ON public.blog_posts FOR DELETE
USING (
  auth.uid() = author_id
  AND public.has_role(auth.uid(), 'editor')
  AND status <> 'published'
);

COMMIT;
