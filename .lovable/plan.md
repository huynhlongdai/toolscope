
## Plan thu thập và nâng cấp module Deal

### Phân tích hiện trạng

**Đã có:**
- Admin CRUD deals đầy đủ (`AdminDeals.tsx`) với form thêm/sửa, toggle active, xóa
- `DealCard.tsx` với voting, share, modal chi tiết
- `DealDetailModal.tsx` hiển thị mã coupon, copy code, link affiliate
- `DealsPage.tsx` hiển thị danh sách public
- `TrendingDeals.tsx` trên homepage
- `DealsSection.tsx` và `DealsWidget.tsx` embed trong tool detail
- Database triggers: `auto_deactivate_expired_deals`, `notify_deal_followers`, `increment_deal_click`

**Thiếu:**
- **Không có tính năng thu thập deals tự động** — khác với tools có `collect-ai`, deals chưa có edge function thu thập
- **Không hỗ trợ dịch đa ngôn ngữ** — `DealCard`, `DealDetailModal`, `DealsPage` chưa dùng `useTranslatedContent`
- **Admin thiếu bulk actions** — import CSV/JSON, bulk delete, bulk toggle
- **Thiếu analytics chi tiết** — chỉ có tổng clicks, không có CTR, conversion tracking
- **Không có AI generate deal content** — admin nhập thủ công toàn bộ

### Thay đổi đề xuất

#### 1. Edge function `collect-deals` (Thu thập deals tự động)
- Tìm deals từ các nguồn: AppSumo, Product Hunt Deals, StackSocial, affiliate networks
- Input: keyword (e.g. "AI tools deals") hoặc tool_id để tìm deals cho tool cụ thể
- Output: Lưu vào bảng `deal_collect_items` (tương tự `collect_items` cho tools)
- Admin review và import vào `deals`

#### 2. Database migration — bảng `deal_collect_items`
```sql
CREATE TABLE public.deal_collect_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  source_url text,
  tool_name text,
  tool_id uuid REFERENCES tools(id),
  title text NOT NULL,
  description text,
  coupon_code text,
  discount_type text DEFAULT 'percentage',
  discount_value numeric,
  deal_url text,
  expires_at timestamptz,
  status text DEFAULT 'pending',
  collected_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### 3. Dịch đa ngôn ngữ cho Deals
- `DealCard.tsx` và `DealDetailModal.tsx`: dùng `useTranslatedContent` dịch `title`, `description`
- `DealsPage.tsx`: dùng `useTranslatedList` dịch listing
- Edge function `translate-deal` (hoặc mở rộng `translate-blog` để hỗ trợ entity_type=deal)
- Thêm Deals vào `ContentTranslationsTab.tsx` để admin quản lý

#### 4. Admin nâng cao
- **Bulk actions**: Import từ CSV/JSON, bulk delete, bulk toggle active
- **AI Generate**: Nút "AI viết mô tả" dựa trên tool info và discount details
- **Analytics card**: Hiển thị top deals by clicks, CTR (clicks/views), deals sắp hết hạn
- **Collect tab**: Tab mới trong AdminDeals để review collected deals

#### 5. Frontend cải thiện
- `DealsPage.tsx`: Thêm filter theo category, sắp xếp (mới nhất, giảm nhiều nhất, sắp hết hạn)
- Hiển thị logo tool trong DealCard
- "Deals đang hot" badge dựa trên click_count

### Files chỉnh sửa (8 files + 1 migration + 1 edge function mới)

| File | Thay đổi |
|---|---|
| `supabase/functions/collect-deals/index.ts` | **Mới** — thu thập deals từ web |
| `supabase/functions/translate-blog/index.ts` | Mở rộng hỗ trợ entity_type=deal |
| Migration SQL | Tạo bảng `deal_collect_items` |
| `src/pages/admin/AdminDeals.tsx` | Thêm tabs (Danh sách / Thu thập / Analytics), bulk actions, AI generate |
| `src/components/deals/DealCard.tsx` | Dùng `useTranslatedContent`, hiển thị logo tool |
| `src/components/deals/DealDetailModal.tsx` | Dùng `useTranslatedContent` |
| `src/pages/DealsPage.tsx` | Dùng `useTranslatedList`, thêm filters, sort options |
| `src/components/admin/translations/ContentTranslationsTab.tsx` | Thêm entity_type=deal |
| `src/components/admin/translations/UntranslatedSection.tsx` | Thêm section deals |
| `src/components/admin/translations/TranslationStats.tsx` | Thêm deal stats |

### Thứ tự thực hiện

1. Migration tạo bảng `deal_collect_items`
2. Edge function `collect-deals` — thu thập từ web
3. Mở rộng `translate-blog` hỗ trợ deals
4. Cập nhật `AdminDeals.tsx` — tabs, bulk actions, AI generate, collect review
5. Cập nhật `DealCard`, `DealDetailModal`, `DealsPage` — dịch đa ngôn ngữ + UI
6. Cập nhật translation admin components — thêm deals

### Technical Details

**Collect-deals sources:**
- Firecrawl search: `"${tool_name} coupon code discount deal"`
- AI fallback: Ask Gemini for known deals/coupons
- Parse results: Extract coupon codes, discount values, expiry dates

**Translation fields cho Deals:**
- `title`, `description` (2 fields cơ bản)
- Lưu trong bảng `translations` với `entity_type='deal'`
