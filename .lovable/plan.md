

## Plan: Tối ưu compact UI bảng giá

### Thay đổi trong `PricingPlansCard.tsx`

**Giảm padding/spacing:**
- CardHeader: `pb-4` → `pb-2`, padding `p-6` → `p-4`
- CardContent: padding mặc định `p-6` → `p-4 pt-0`
- Plan card: `p-5` → `p-3`, `rounded-xl` → `rounded-lg`
- Grid gap: `gap-5` → `gap-3`
- Plan name margin: `mb-3` → `mb-1.5`
- Price font: `text-3xl` → `text-xl`, free price `text-2xl` → `text-lg`
- Title: `text-lg` → `text-base`, icon `h-5 w-5` → `h-4 w-4`
- FeaturesList separator: `my-3` → `my-2`, feature spacing `space-y-2` → `space-y-1.5`

**Bỏ hover translate effect** (`hover:-translate-y-0.5`) — gây nhảy layout, thay bằng chỉ `hover:shadow-md`.

**Popular scale:** `scale-[1.02]` → bỏ scale, chỉ giữ border highlight.

### File ảnh hưởng
- `src/components/tool-detail/PricingPlansCard.tsx`

