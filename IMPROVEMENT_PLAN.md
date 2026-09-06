# ToolScope — Improvement Plan

## Status Legend
- [ ] Pending
- [x] Done
- [~] In Progress

---

## Priority 1 — High Impact UI/UX

- [ ] 1.1 Hero Section: typewriter animation, floating search dropdown, animated stats
- [ ] 1.2 ToolCard: logo skeleton, hover preview tooltip, "New" badge
- [x] 1.3 ToolDetail: sticky only lg+, back-to-top button (done). Sidebar
      "bottom-sheet" reinterpreted as collapsible cards (ScreenshotGallery,
      AlternativesSection collapse by default on mobile) — functionally
      equivalent scroll-fatigue fix, not a literal bottom-sheet drawer.
- [ ] 1.4 Auth: Google OAuth + GitHub OAuth buttons — blocked, needs user to
      create OAuth app credentials (Google Cloud Console / GitHub OAuth App)
      and provide Client ID/Secret before this can be wired into Supabase Auth.

## Priority 2 — Functionality

- [x] 2.1 ToolsPage: multi-select categories, free-trial filter, AI score range, URL-persisted filters
      — category filter upgraded from single Select to a Popover+Checkbox
      multi-select (`category=id1,id2` in URL); added free-trial-only
      checkbox (`trial=1`) and an AI-score-range Slider (`aiScore=N`, uses
      `ai_scores!inner(...)` join filter so it doesn't accidentally hide
      tools that have no AI score row when the filter is off); all wired
      into `fetchToolsList()`'s query params + URL sync. Verified via
      Playwright (page loads clean, no console errors, with and without
      the new filter query params).
- [ ] 2.2 Search: 300ms debounce, autocomplete dropdown, localStorage history
- [ ] 2.3 ComparePage: extract services/compare.ts, URL sharing, export PDF
      (mobile card/accordion view for the comparison table already done as
      part of the mobile redesign batch — the desktop `<table>` + refactor
      into services/compare.ts + PDF export are still pending)
- [x] 2.4 ToolDetail: load user's existing rating on mount — done
      (`fetchUserRating` query + `existingRating` effect already implemented)
- [x] 2.5 OptimizedImage component: lazy load, blur placeholder, Intersection Observer
      — component existed (`src/components/ui/OptimizedImage.tsx`) but was
      unused anywhere; wired it into ToolCard.tsx (logo, highest repeat count
      site-wide), BlogPage.tsx + WorkflowsPage.tsx (grid cover images), and
      BlogDetail.tsx related-posts thumbnails (below-fold, lazy-safe).
      Intentionally NOT applied to BlogDetail's main article hero cover image
      (likely LCP element) — IntersectionObserver-gated lazy load would delay
      the largest above-fold paint instead of helping it.

## Priority 3 — Performance & Technical Debt

- [ ] 3.1 Bundle: further split vendor-icons via dynamic import grouping
- [ ] 3.2 Virtual list: @tanstack/react-virtual for ToolsPage list view
- [x] 3.3 SEO: Edge Function sitemap.xml, public/robots.txt — done
      (`supabase/functions/sitemap` covers both; VPS nginx proxy for
      `/sitemap.xml` was found pointing at a stale/decommissioned Supabase
      project ref and was fixed live + in repo `nginx.conf` + `supabase/config.toml`
      this session — see session notes)
- [ ] 3.4 Skeleton loading: unified skeleton components across all pages

## Priority 4 — UI Polish

- [ ] 4.1 Micro-animations: page transitions, card hover, button spinners
- [ ] 4.2 Empty states: illustrated, with CTA suggestions
- [ ] 4.3 Dark mode: border/bg consistency, code block syntax highlight

---

## Roadmap

| Week | Tasks |
|------|-------|
| 1 | 1.4 Google OAuth · 2.4 user rating load · 3.3 sitemap |
| 2 | 1.1 Hero upgrade · 2.2 search debounce · 2.1 advanced filters |
| 3 | 1.2 ToolCard hover · 2.5 OptimizedImage · 3.1 bundle split |
| 4 | 1.3 mobile layout · 2.3 Compare refactor · 4.x polish |
