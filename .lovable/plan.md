

## Plan: Nâng cấp UI/UX bảng giá + Structured Data SEO

### Vấn đề hiện tại
- Giao diện bảng giá đơn giản, thiếu visual hierarchy
- Không có structured data cho SEO/AI crawlers
- Thiếu gradient, spacing, hover effects

### Thay đổi: Viết lại `PricingPlansCard.tsx`

**UI/UX cải thiện:**
- Gradient header cho gói Popular (highlight nổi bật)
- Scale effect cho gói Popular (transform scale-105)
- Phân tách rõ giá trị: giá lớn, currency nhỏ, period mờ
- Thêm separator giữa giá và features
- Hover effect nâng shadow mạnh hơn
- Badge "Phổ biến nhất" gradient thay vì flat
- Icon khác nhau cho Free vs Paid (Gift vs CreditCard)
- Thêm "Miễn phí" text khi price = 0
- Responsive tốt hơn: equal height cards với flex-col

**SEO + AI structured data:**
- Thêm JSON-LD `Product > Offer` schema trong `<script type="application/ld+json">`
- Sử dụng semantic HTML: `<section>`, `<article>`, `aria-label`
- Thêm `itemScope`, `itemType` cho Schema.org markup

**Props mở rộng:**
- Thêm `toolName` prop để dùng trong structured data

### File ảnh hưởng
- `src/components/tool-detail/PricingPlansCard.tsx` (viết lại)
- `src/pages/ToolDetail.tsx` (truyền thêm prop `toolName`)

