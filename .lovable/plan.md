

## Plan: Toi uu khoang trong trang chu

### Van de hien tai

Cac section dang co padding qua lon, tao cam giac thua khoang trong:
- **HeroSection**: `py-20 md:py-28` — qua rong cho above-the-fold
- **FeaturedTools**: `py-16` + `mb-8` header — thua
- **StatsCounter**: `py-12` — ok nhung co the giam
- **RecentReviews**: `py-12 md:py-16` — thua
- **TrendingDeals**: `py-12 md:py-16` — thua
- **BlogPreview**: `py-12 md:py-16` — thua
- **NewsletterCTA**: `py-16` — thua
- **CategoryGrid**: `py-8 md:py-12` — ok
- Empty state FeaturedTools: `p-12` — qua rong

### Thay doi cu the

**1. HeroSection.tsx**
- `py-20 md:py-28` → `py-12 md:py-20`
- `mt-8` (form) → `mt-6`
- `mt-5` (subtitle) → `mt-3`
- `mb-6` (badge) → `mb-4`

**2. FeaturedTools.tsx**
- `py-16` → `py-10 md:py-12`
- `mb-8` (header) → `mb-5`
- `mt-8` (xem tat ca link) → `mt-6`
- Empty state `p-12` → `p-8`

**3. StatsCounter.tsx**
- `py-12` → `py-8 md:py-10`

**4. RecentReviews.tsx**
- `py-12 md:py-16` → `py-8 md:py-10`

**5. TrendingDeals.tsx**
- `py-12 md:py-16` → `py-8 md:py-10`

**6. BlogPreview.tsx**
- `py-12 md:py-16` → `py-8 md:py-10`

**7. NewsletterCTA.tsx**
- `py-16` → `py-10 md:py-12`
- `mt-6` (form) → `mt-4`

### Files thay doi (7 files)
- `src/components/home/HeroSection.tsx`
- `src/components/home/FeaturedTools.tsx`
- `src/components/home/StatsCounter.tsx`
- `src/components/home/RecentReviews.tsx`
- `src/components/home/TrendingDeals.tsx`
- `src/components/home/BlogPreview.tsx`
- `src/components/home/NewsletterCTA.tsx`

