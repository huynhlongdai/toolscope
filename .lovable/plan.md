

## Plan: Tối uu trang chu ToolScope

### Phan 1: Sap xep danh muc gon gang

**CategoryGrid.tsx** - Chuyen sang horizontal scroll tren mobile, grid compact tren desktop:
- Mobile: horizontal scrollable row (1 dong, cuon ngang), an bot header "Danh muc cong cu"
- Desktop: flex-wrap chips nhu hien tai nhung giam padding, gioi han 8 items (thay vi 12)
- Them tool count cho moi category (query count tu tools table)

### Phan 2: Toi uu trang chu UI/UX + SEO + Marketing

Cau truc trang chu moi (Index.tsx) theo thu tu:

```text
1. Header
2. HeroSection (giu nguyen, da tot)
3. CategoryGrid (compact)
4. FeaturedTools (giu nguyen)
5. [MOI] StatsCounter - Social proof
6. [MOI] RecentReviews - Review moi nhat
7. [MOI] TrendingDeals - Uu dai noi bat
8. [MOI] BlogPreview - Bai viet moi
9. [MOI] NewsletterCTA - Dang ky nhan tin
10. Footer
```

#### Chi tiet tung component moi:

**A. StatsCounter** (`src/components/home/StatsCounter.tsx`)
- Query count tu tools, reviews, categories, profiles
- Hien thi 4 so: "1000+ Tools", "500+ Reviews", "50+ Danh muc", "10K+ Nguoi dung"
- Animated count-up effect, semantic `<section>` voi aria-label
- Background khac biet (primary/5) de tach section

**B. RecentReviews** (`src/components/home/RecentReviews.tsx`)
- Query 4 reviews moi nhat co rating >= 4, join tools(name, slug, logo_url)
- Card nho: avatar/ten user, rating stars, noi dung truncate 2 dong, link den tool
- Social proof manh cho SEO (review content = unique text)

**C. TrendingDeals** (`src/components/home/TrendingDeals.tsx`)
- Query 3 deals is_active, chua het han, join tools(name, slug)
- Compact card: ten tool, discount badge, CTA button
- Chi hien section neu co deals

**D. BlogPreview** (`src/components/home/BlogPreview.tsx`)
- Query 3 blog_posts status=published, moi nhat
- Card: cover_image (lazy load), title, excerpt truncate, date
- Link "Xem tat ca bai viet" den /blog

**E. NewsletterCTA** (`src/components/home/NewsletterCTA.tsx`)
- Full-width banner voi gradient background
- Headline + subtitle + email input + subscribe button
- Reuse logic tu Footer NewsletterForm
- CTA marketing: "Nhan update hang tuan ve cong cu moi"

### Phan 3: SEO nang cao

**Index.tsx SEOHead updates:**
- Them `canonical` URL
- Them `ogImage` (logo hoac default OG image)
- Mo rong JSON-LD: them `Organization` schema ben canh `WebSite`
- Them `sameAs` links (social)

**index.html updates:**
- Cap nhat default title/description/OG tags cho ToolScope (thay vi "Lovable App")
- Them `<link rel="preconnect">` cho Supabase domain
- Them `<meta name="theme-color">`

### Phan 4: Performance & Accessibility

- Tat ca image dung `loading="lazy"` va `decoding="async"`
- FeaturedTools: them `fetchpriority="low"` cho tool logos
- Semantic HTML: moi section co `aria-label`, heading hierarchy dung (h1 > h2 > h3)
- CategoryGrid: them `role="navigation"` va `aria-label="Danh muc"`

---

### Files thay doi

**Tao moi (5 files):**
- `src/components/home/StatsCounter.tsx`
- `src/components/home/RecentReviews.tsx`
- `src/components/home/TrendingDeals.tsx`
- `src/components/home/BlogPreview.tsx`
- `src/components/home/NewsletterCTA.tsx`

**Chinh sua (4 files):**
- `src/pages/Index.tsx` - them 5 components moi + SEO updates
- `src/components/home/CategoryGrid.tsx` - compact layout, horizontal scroll mobile
- `index.html` - meta tags, preconnect, theme-color
- `src/components/home/FeaturedTools.tsx` - lazy loading images

