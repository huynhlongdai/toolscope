

## Module Ưu Đãi / Deals & Coupons

### Tổng quan
Xây dựng hệ thống quản lý và hiển thị ưu đãi (deals, coupon, khuyến mãi) gắn với từng tool. Admin có thể tạo/quản lý deals, nhúng vào bài viết chi tiết, và hiển thị nổi bật trên trang tool detail.

### 1. Database: `deals` table

```sql
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,                    -- "Giảm 50% gói Pro"
  description text,                       -- Chi tiết ưu đãi
  coupon_code text,                       -- "SAVE50" (nullable nếu tự động áp dụng)
  discount_type text DEFAULT 'percentage', -- percentage, fixed, free_trial, custom
  discount_value numeric,                 -- 50 (cho 50%)
  deal_url text,                          -- Link affiliate/landing page ưu đãi
  original_price numeric,                 -- Giá gốc (hiển thị gạch ngang)
  deal_price numeric,                     -- Giá sau giảm
  currency text DEFAULT 'USD',
  starts_at timestamptz,
  expires_at timestamptz,                 -- NULL = không hết hạn
  is_verified boolean DEFAULT false,      -- Admin xác minh
  is_exclusive boolean DEFAULT false,     -- Độc quyền trên ToolScope
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: public SELECT on active deals, admin ALL
-- Enable realtime for live updates
```

### 2. Frontend Components

**`DealCard` component** — Hiển thị deal hấp dẫn:
- Badge "Độc quyền" / "Đã xác minh" / "Sắp hết hạn"
- Hiển thị giá gốc (gạch ngang) → giá deal
- Nút copy coupon code (click to copy)
- Countdown timer nếu có `expires_at`
- Nút "Nhận ưu đãi" → link affiliate
- Click tracking (increment `click_count`)

**`DealsSection` on ToolDetail** — Hiển thị trong sidebar hoặc main content:
- Query deals active cho tool hiện tại
- Sắp xếp: exclusive first, then by discount value
- Nổi bật với border gradient hoặc background highlight

**`DealsWidget` embeddable** — Component nhỏ có thể nhúng vào bất kỳ đâu:
- Dùng trong `DetailedArticle` (bài viết chi tiết) qua shortcode `[deals]` hoặc HTML block
- Dùng trong Page Builder như một block type mới
- Dùng trên trang chủ/category page

### 3. Admin: Quản lý Deals

**Tab "Deals" trong ToolFormDialog** — Thêm tab thứ 8 trong dialog chỉnh sửa tool:
- Danh sách deals hiện tại của tool
- Form tạo/sửa deal: title, coupon code, discount type/value, URL, giá gốc/deal, thời hạn
- Toggle verified/exclusive/active
- Thống kê click count

**Trang `/admin/deals`** (tùy chọn) — Dashboard tổng quan deals:
- Tất cả deals across tools, filter by status/expired
- Bulk actions: deactivate expired deals
- Stats: total clicks, active deals count

### 4. Tích hợp vào bài viết

Trong `DetailedArticle`, detect shortcode `[deals]` hoặc `[deal:coupon_code]` trong content và render `DealsWidget` inline. Cũng hỗ trợ trong RichTextEditor qua nút "Insert Deal Block".

### 5. Ý tưởng bổ sung

- **Deal alerts**: Người dùng follow tool sẽ nhận notification khi có deal mới
- **Deals page `/deals`**: Trang tổng hợp tất cả deals đang active, filter theo category/discount type
- **Deal voting**: Người dùng upvote/downvote deal (xác minh cộng đồng)
- **Price drop alerts**: So sánh `pricing_history` với deal price, highlight "giá thấp nhất từ trước đến nay"
- **Seasonal deals collection**: Tự động gom deals theo mùa (Black Friday, Tết, etc.)
- **Deal expiry auto-deactivate**: Database trigger tự động set `is_active = false` khi `expires_at < now()`
- **Embed shortcode cho blog posts**: `[deals tool="chatgpt"]` render deals widget trong blog

### Files to Create/Edit

| File | Action |
|---|---|
| Migration SQL | Create `deals` table with RLS + trigger |
| `src/components/deals/DealCard.tsx` | New — deal display card |
| `src/components/deals/DealsSection.tsx` | New — deals list for tool detail |
| `src/components/deals/DealsWidget.tsx` | New — embeddable deals widget |
| `src/pages/ToolDetail.tsx` | Add DealsSection to sidebar |
| `src/pages/admin/AdminTools.tsx` | Add Deals tab in ToolFormDialog |
| `src/pages/DealsPage.tsx` | New — all deals listing page |
| `src/pages/admin/AdminLayout.tsx` | Add Deals nav item |
| `src/App.tsx` | Add `/deals` route |
| `src/components/tool-detail/DetailedArticle.tsx` | Support `[deals]` shortcode |

### Implementation Order
1. Create `deals` table + RLS
2. Build DealCard and DealsSection components
3. Add to ToolDetail sidebar
4. Add Deals tab in admin ToolFormDialog
5. Add DealsPage for public browsing
6. Add shortcode support in DetailedArticle
7. Add deal notification integration

