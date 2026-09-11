-- Deals enrichment: bring the "deals" (voucher/coupon) content type up to the
-- same level of richness as tools/blog_posts, per user request "phần deal
-- có vẻ hơi thô sơ, tôi cần bạn research để bổ sung idea" (2026-09-11).
--
-- Adds (Nhóm 1 - high impact / low effort):
--   - deal_type: what KIND of offer this is (lifetime_deal, free_trial_extended,
--     student_discount, referral, bundle, flash_sale, no_code_auto), distinct
--     from discount_type which only describes HOW the discount is computed
--     (percentage/fixed/free_trial). A lifetime deal and a 20% coupon are both
--     discount_type-agnostic concepts that deserve their own filter/badge.
--   - redemption_type: code (must enter a coupon code) | auto_apply (discount
--     applies automatically via the link, no code needed) | manual_contact
--     (must contact sales/support) - many AI tool "deals" are just affiliate
--     links with no real code, and the UI currently shows a fake "copy code"
--     button for those, which is misleading.
--   - last_verified_at / verified_by: is_verified was a static admin flag set
--     once at creation and never revisited. Coupons silently die over time
--     (expires_at is often unset because the source didn't publish one) -
--     community "still works?" reporting needs a place to write to.
--   - eligibility (jsonb): { new_users_only, existing_users_only, min_plan,
--     countries: [] } - conditions that determine whether a given visitor can
--     actually use the deal, previously not stored anywhere.
--   - terms_conditions (text): long-form terms, kept separate from
--     description (which is meant to stay short for card display).
--
-- Adds (Nhóm 2 - chosen for this pass):
--   - slug (unique): lets each deal get its own /deals/:slug page instead of
--     only ever appearing inline inside a card/modal - meaningful SEO traffic
--     ("ChatGPT Plus coupon code" search intent) was previously unreachable.
--   - usage_limit / current_uses: coupons are frequently capped ("first 100
--     users") - a universally-cited required field in coupon system design
--     (GeeksForGeeks Coupon/Voucher System, Stack Overflow coupon schema
--     discussions) that was entirely absent here.
--   - banner_image_url: dedicated promo banner distinct from the tool's logo,
--     for a nicer /deals/:slug hero and richer card art.
--   - savings_percent: a GENERATED column computed from original_price/
--     deal_price so "sort by biggest savings" works uniformly even for deals
--     that only set prices and never set discount_value (which today is only
--     meaningful for discount_type='percentage'/'fixed').
--
-- Also fixes a **pre-existing, previously-unnoticed bug**: DealCard.tsx has
-- always called `supabase.from("votes").insert({ target_type: "deal", ... })`
-- for the upvote/downvote feature, but the `votes` table's CHECK constraint
-- only ever allowed target_type IN ('review','comment','answer') - so every
-- deal vote insert has been silently failing in production (confirmed via
-- direct query: 0 rows in votes with target_type='deal' despite the feature
-- existing in the UI for a while). This migration extends the CHECK to also
-- allow 'deal' and 'tool' (tools/upvotes exists as a column too, likely hit
-- the same historical gap) so voting actually persists going forward.

-- ── 1. New deal_type + redemption_type enums (as CHECK, not native enum, to
--    match the existing discount_type text-with-default convention already
--    used on this table rather than introducing a new pg enum type) ────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_type text NOT NULL DEFAULT 'coupon_code'
    CHECK (deal_type IN (
      'coupon_code', 'lifetime_deal', 'free_trial_extended',
      'student_discount', 'referral', 'bundle', 'flash_sale', 'no_code_auto'
    )),
  ADD COLUMN IF NOT EXISTS redemption_type text NOT NULL DEFAULT 'code'
    CHECK (redemption_type IN ('code', 'auto_apply', 'manual_contact'));

-- ── 2. Community re-verification (separate from the static is_verified flag
--    admin sets once; last_verified_at/verified_by track the most recent
--    "still works" confirmation, refreshed by the new verify_deal action) ──
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- ── 3. Eligibility conditions + long-form terms ─────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS eligibility jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_conditions text;

-- ── 4. Slug for dedicated /deals/:slug pages ────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs for any existing rows before adding the UNIQUE constraint
-- (production currently has 5 real deals - none of them have a slug yet).
UPDATE public.deals
SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

ALTER TABLE public.deals ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS deals_slug_key ON public.deals(slug);

-- ── 5. Usage cap tracking ───────────────────────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS usage_limit integer,
  ADD COLUMN IF NOT EXISTS current_uses integer NOT NULL DEFAULT 0;

-- ── 6. Banner image (distinct from the tool's own logo_url) ─────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS banner_image_url text;

-- ── 7. Generated savings_percent - works even when discount_value is null
--    (e.g. deal_type='lifetime_deal' typically only sets original/deal price,
--    never a discount_value, since "percentage off" doesn't really describe
--    a one-time lifetime purchase) ───────────────────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS savings_percent numeric
    GENERATED ALWAYS AS (
      CASE
        WHEN original_price IS NOT NULL AND original_price > 0 AND deal_price IS NOT NULL
          THEN round(((original_price - deal_price) / original_price) * 100, 1)
        ELSE NULL
      END
    ) STORED;

-- ── 8. increment_deal_uses RPC - lets the public site atomically bump
--    current_uses when a visitor redeems/clicks a deal, and auto-deactivates
--    once usage_limit is reached (mirrors the existing
--    auto_deactivate_expired_deals trigger pattern for expires_at). ────────
CREATE OR REPLACE FUNCTION public.increment_deal_uses(deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deals
  SET current_uses = current_uses + 1,
      is_active = CASE WHEN usage_limit IS NOT NULL AND current_uses + 1 >= usage_limit THEN false ELSE is_active END
  WHERE id = deal_id;
END;
$$;

-- ── 9. verify_deal RPC - any authenticated user can "confirm still works" /
--    "report broken", which bumps last_verified_at (still-works) or nudges
--    is_verified back to false + notifies admins (reported broken). Kept as
--    a SECURITY DEFINER RPC (like publish_content) rather than a raw column
--    update so the community signal is auditable and rate-limit-able later
--    without changing the RLS model of the deals table itself. ────────────
CREATE OR REPLACE FUNCTION public.verify_deal(_deal_id uuid, _still_works boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deal_title text;
BEGIN
  IF _still_works THEN
    UPDATE public.deals
    SET last_verified_at = now(), verified_by = auth.uid()
    WHERE id = _deal_id;
  ELSE
    SELECT title INTO _deal_title FROM public.deals WHERE id = _deal_id;
    UPDATE public.deals SET is_verified = false WHERE id = _deal_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    SELECT ur.user_id, 'system', 'Deal bị báo lỗi',
      format('Người dùng báo deal "%s" không còn dùng được, cần admin kiểm tra lại.', COALESCE(_deal_title, 'N/A')),
      '/admin/deals?deal=' || _deal_id,
      jsonb_build_object('deal_id', _deal_id)
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
END;
$$;

-- ── 10. Fix pre-existing votes.target_type gap for 'deal' (and 'tool',
--     which has the same upvotes/downvotes column pattern and is likely
--     affected the same way) so DealCard's vote insert actually persists. ──
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_target_type_check;
ALTER TABLE public.votes ADD CONSTRAINT votes_target_type_check
  CHECK (target_type IN ('review', 'comment', 'answer', 'deal', 'tool'));

-- ── 11. publish_content() already branches on _table='deals' to set only
--     is_active (from the 20260906040000 migration) - no change needed there,
--     new columns are all editor-writable like the rest of the row.

COMMENT ON COLUMN public.deals.deal_type IS 'Loại ưu đãi (khác discount_type - discount_type chỉ mô tả cách tính giảm giá)';
COMMENT ON COLUMN public.deals.redemption_type IS 'code = cần nhập mã, auto_apply = tự động giảm khi click link, manual_contact = phải liên hệ';
COMMENT ON COLUMN public.deals.eligibility IS 'jsonb: {new_users_only, existing_users_only, min_plan, countries: []}';
COMMENT ON COLUMN public.deals.savings_percent IS 'Generated: % tiết kiệm tính từ original_price/deal_price, NULL nếu thiếu 1 trong 2 giá';
