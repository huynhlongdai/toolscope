-- P2-1: Server-side pagination + counting for AdminUsers.
--
-- Before this migration, src/pages/admin/AdminUsers.tsx loaded the ENTIRE
-- `profiles` table plus the ENTIRE `user_roles`, `user_warnings` tables and
-- the id columns of `reviews`/`comments`/`questions` into the browser, then
-- computed per-user counts via nested Array.filter() (O(n*m)), and only
-- applied pagination client-side via .slice() AFTER filtering everything
-- in memory. This does not scale as the user base grows.
--
-- This migration adds:
--   1. Indexes on the FK columns used for the per-user counts (none existed).
--   2. `admin_list_users(...)` RPC: does the search/role/ban/activity
--      filtering, the count aggregation, and the pagination entirely in
--      Postgres, returning only the requested page plus a `total_count`
--      column (via referencing the `filtered` CTE twice) so the client can
--      still render "Trang X / Y" without a second round-trip.
--
-- Security: the function is SECURITY DEFINER (it must bypass owner-level
-- restrictions to join auth-adjacent data efficiently), so — mirroring the
-- has_role(...) checks already used throughout this project's RLS policies
-- and the P0 edge-function auth helper — admin membership is enforced
-- INSIDE the function body (via a WHERE guard on has_role), not left to the
-- caller. A non-admin caller gets zero rows back, never an error leaking
-- schema details.

-- 1. Indexes needed for the counting subqueries/joins below.
CREATE INDEX IF NOT EXISTS idx_reviews_author_id ON public.reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON public.user_warnings(user_id);

-- 2. Paginated + filtered + counted user listing RPC.
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _role text DEFAULT 'all',
  _ban_filter text DEFAULT 'all',
  _activity_filter text DEFAULT 'all',
  _page int DEFAULT 0,
  _page_size int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  website text,
  reputation_score integer,
  is_banned boolean,
  created_at timestamptz,
  roles text[],
  review_count bigint,
  comment_count bigint,
  question_count bigint,
  warning_count bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT
      p.id,
      COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles,
      (SELECT count(*) FROM public.reviews r WHERE r.author_id = p.id) AS review_count,
      (SELECT count(*) FROM public.comments c WHERE c.user_id = p.id) AS comment_count,
      (SELECT count(*) FROM public.questions q WHERE q.user_id = p.id) AS question_count,
      (SELECT count(*) FROM public.user_warnings w WHERE w.user_id = p.id) AS warning_count
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    GROUP BY p.id
  ),
  filtered AS (
    SELECT
      p.id, p.username, p.display_name, p.avatar_url, p.bio, p.website,
      p.reputation_score, p.is_banned, p.created_at,
      cnt.roles, cnt.review_count, cnt.comment_count, cnt.question_count, cnt.warning_count
    FROM public.profiles p
    JOIN counts cnt ON cnt.id = p.id
    WHERE
      -- Only admins may call this function; non-admins get an empty result set.
      public.has_role(auth.uid(), 'admin'::app_role)
      AND (_search IS NULL OR _search = '' OR p.display_name ILIKE '%' || _search || '%' OR p.username ILIKE '%' || _search || '%')
      AND (_role IS NULL OR _role = 'all' OR _role = ANY(cnt.roles))
      AND (
        _ban_filter IS NULL OR _ban_filter = 'all'
        OR (_ban_filter = 'banned' AND p.is_banned)
        OR (_ban_filter = 'active' AND NOT p.is_banned)
      )
      AND (
        _activity_filter IS NULL OR _activity_filter = 'all'
        OR (_activity_filter = 'active' AND (cnt.review_count + cnt.comment_count + cnt.question_count) > 0)
        OR (_activity_filter = 'inactive' AND (cnt.review_count + cnt.comment_count + cnt.question_count) = 0)
      )
  )
  SELECT
    f.id, f.username, f.display_name, f.avatar_url, f.bio, f.website,
    f.reputation_score, f.is_banned, f.created_at,
    f.roles, f.review_count, f.comment_count, f.question_count, f.warning_count,
    (SELECT count(*) FROM filtered) AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT LEAST(GREATEST(_page_size, 1), 5000)
  OFFSET GREATEST(_page, 0) * LEAST(GREATEST(_page_size, 1), 5000);
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text, text, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, int, int) TO authenticated;
