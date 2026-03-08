

## Plan nâng cấp cài đặt AI Provider

### Vấn đề hiện tại

Sau khi review code và console logs, tôi nhận thấy:

1. **UI đang hoạt động** nhưng có warning "Function components cannot be given refs" từ Select component
2. **Thiếu nhiều tính năng quan trọng** cho quản lý AI thực tế:
   - Không có usage tracking/thống kê sử dụng AI
   - Không xóa được key đã lưu
   - Không có trạng thái health check realtime cho từng provider
   - Test connection chỉ kiểm tra authentication, không test actual generation
   - Không có logs để debug khi AI call fails
   - Không hiển thị provider nào đang active cho feature nào trên overview
   - Firecrawl key nằm riêng nhưng không có backup key support

### Nâng cấp đề xuất

#### 1. Cải thiện UX quản lý API Keys

- **Xóa key**: Thêm nút xóa cho primary/backup key đã lưu
- **Copy masked key**: Nút copy key đã mask để reference
- **Bulk test**: Nút "Test tất cả" để kiểm tra toàn bộ keys đã cấu hình cùng lúc
- **Status indicator**: Hiển thị trạng thái kết nối (last tested, success/fail) bên cạnh mỗi provider

#### 2. Test connection nâng cao

- **Deep test**: Ngoài test auth (GET models), thêm option test actual generation bằng cách gửi prompt đơn giản ("Say hello") để xác nhận model hoạt động
- **Test per-feature**: Nút test cho từng feature config row — gọi đúng provider+model đã chọn
- **Test results log**: Hiển thị response time, model trả về, error message chi tiết

#### 3. AI Usage Dashboard (Card mới trong tab AI)

- Hiển thị tổng số lần gọi AI theo provider/feature (đếm từ bảng mới `ai_usage_logs`)
- Biểu đồ đơn giản (bar chart) cho usage 7 ngày gần nhất
- Cần migration tạo bảng `ai_usage_logs` (provider, feature, model, tokens_used, duration_ms, status, created_at)
- Edge functions log mỗi lần gọi `callAI()` vào bảng này

#### 4. Provider Overview Card

- Bảng tổng hợp: mỗi provider hiển thị số features đang dùng, trạng thái key (configured/missing), model mặc định
- Giúp admin nhanh chóng biết provider nào đang active

#### 5. Import/Export cấu hình AI

- Export toàn bộ `ai_provider_config` ra JSON (không bao gồm keys)
- Import config JSON để restore hoặc clone cấu hình sang site khác

### Database Migration

```sql
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  feature text NOT NULL,
  model text,
  tokens_used integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  status text DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI logs"
  ON public.ai_usage_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Files chỉnh sửa

| File | Thay đổi |
|---|---|
| `src/pages/admin/AdminSettings.tsx` | Thêm Card overview, usage dashboard, bulk test, delete key, import/export config |
| `supabase/functions/_shared/ai-provider.ts` | Log usage vào `ai_usage_logs` sau mỗi lần `callAI()` |
| `supabase/functions/manage-ai-keys/index.ts` | Thêm actions: `delete_key`, `deep_test`, `get_usage_stats`, `export_config` |
| Migration SQL | Tạo bảng `ai_usage_logs` |

### Thứ tự thực hiện

1. Migration tạo bảng `ai_usage_logs`
2. Cập nhật `ai-provider.ts` — logging usage
3. Cập nhật `manage-ai-keys/index.ts` — actions mới
4. Cập nhật `AdminSettings.tsx` — UI mới (overview, usage chart, bulk test, delete, import/export)

