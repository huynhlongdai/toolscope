-- Content-first affiliate revamp: classify blog_posts by article type and
-- link them to a primary affiliate tool / CTA, plus lightweight structured
-- fields for Verdict Box (review), Listicle ranking and Case Study stats.
--
-- NOTE: This migration cannot be applied automatically in this environment
-- (only the anon/publishable Supabase key is available here, which is
-- read-only under RLS). Apply manually via the Supabase SQL editor or
-- `supabase db push` with a service-role/DB-owner connection.
--
-- The frontend is written to degrade gracefully (inferring article_type from
-- tags when the column is absent) so the site keeps working before this is
-- applied, per the agreed rollout plan.

-- 1. article_type enum + column ---------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.article_type AS ENUM ('review', 'listicle', 'case_study', 'comparison', 'howto');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS article_type public.article_type NOT NULL DEFAULT 'howto';

-- 2. Affiliate / CTA linkage --------------------------------------------------
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS primary_tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS has_affiliate_links boolean NOT NULL DEFAULT false;

-- 3. Verdict Box fields (article_type = 'review') -----------------------------
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS verdict_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS verdict_summary text,
  ADD COLUMN IF NOT EXISTS verdict_pros text[],
  ADD COLUMN IF NOT EXISTS verdict_cons text[],
  ADD COLUMN IF NOT EXISTS verdict_best_for text;

-- 4. Listicle ranked items (article_type = 'listicle') ------------------------
-- Stored as JSONB array so ranking/editing doesn't require a join table:
-- [{ "rank": 1, "tool_id": "...", "badge": "Best Overall", "cta_label": "Try Free",
--    "highlight": "...", "pros": [...], "cons": [...] }, ...]
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS listicle_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5. Case Study stats + tools used (article_type = 'case_study') --------------
-- stats: [{ "label": "Time Saved", "value": "12h/week", "icon": "clock" }, ...]
-- tools_used: [{ "tool_id": "...", "role": "Primary writing tool" }, ...]
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS case_study_stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS case_study_tools_used jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 6. Helpful index for filtering the Reviews & Guides hub by type -------------
CREATE INDEX IF NOT EXISTS idx_blog_posts_article_type ON public.blog_posts (article_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_primary_tool_id ON public.blog_posts (primary_tool_id);

COMMENT ON COLUMN public.blog_posts.article_type IS 'Drives which layout BlogDetail.tsx renders: review => VerdictBox, listicle => ListicleItem[], case_study => CaseStudyStats + ToolsUsedSidebar, comparison/howto => standard article layout.';
