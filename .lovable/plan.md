

## Nâng cấp Quản lý Tools: Kiểm tra trạng thái hoạt động (Health Check)

### Vấn đề
Hiện tại không có cơ chế kiểm tra xem website của tool còn hoạt động hay đã ngừng (domain chết, trang 404, redirect lạ). Tool "chết" vẫn hiển thị bình thường trên trang chủ.

### Tính năng đề xuất

**1. Health Check tự động & thủ công**
- Edge function `check-tool-health` kiểm tra HTTP status của `website_url`
- Phân loại: `active` (200-299), `warning` (301/302 redirect khác domain, 403), `dead` (404, 5xx, timeout, DNS fail)
- Nút "Check Health" trong admin cho từng tool + nút "Check All" batch

**2. Cột mới trong bảng `tools`**
- `health_status`: enum `active | warning | dead | unknown`
- `health_checked_at`: timestamp lần check cuối
- `health_details`: text ghi lý do (vd: "HTTP 404", "DNS_FAIL", "Redirected to another-domain.com")

**3. Tự động ẩn tool chết**
- Nếu `health_status = 'dead'` → tự động chuyển `status` sang `archived` (không hiển thị trang chủ)
- Nếu `warning` → giữ nguyên nhưng hiện cảnh báo vàng trong admin
- Admin có thể override (force keep published)

**4. UI cảnh báo trong Admin Tools**
- Badge đỏ 🔴 cho tool dead, vàng 🟡 cho warning, xanh 🟢 cho active
- Bộ lọc mới theo health status
- Dashboard widget hiển thị số tool cần kiểm tra

**5. Scheduled check (ý tưởng bổ sung)**
- Cron job chạy hàng tuần check tất cả tools
- Gửi notification cho admin khi phát hiện tool chết
- Lưu lịch sử health check để phát hiện tool hay bị gián đoạn

### Luồng hoạt động

```text
Admin bấm "Check Health" (hoặc cron tự động)
        │
        ▼
Edge function fetch HEAD request tới website_url
        │
        ├── 200-299 → health_status = 'active'
        ├── 301/302 redirect khác domain → 'warning'  
        ├── 403/404/5xx/timeout → 'dead'
        │         │
        │         ▼
        │   Auto archive tool + notify admin
        │
        ▼
Cập nhật health_status, health_checked_at, health_details
```

### Kế hoạch thực hiện

#### 1. DB Migration
- Thêm 3 cột vào bảng `tools`: `health_status`, `health_checked_at`, `health_details`

#### 2. Edge Function `check-tool-health`
- Nhận `tool_id` (single) hoặc `batch: true` (check tất cả published tools)
- Fetch HEAD request với timeout 10s
- Cập nhật health status + tự động archive nếu dead
- Tạo notification cho admin khi phát hiện tool dead/warning

#### 3. Cập nhật AdminTools.tsx
- Hiển thị health badge (🟢🟡🔴) trong danh sách
- Nút "Check Health" trong dropdown menu mỗi tool
- Nút "Check All" ở toolbar
- Bộ lọc theo health status
- Hiển thị thời gian check cuối

#### 4. Dashboard widget
- Card "Tool Health" trên AdminDashboard hiển thị tổng quan: X active, Y warning, Z dead

### Files chỉnh sửa
- **Migration**: thêm cột `health_status`, `health_checked_at`, `health_details` vào `tools`
- **New**: `supabase/functions/check-tool-health/index.ts`
- **Update**: `src/pages/admin/AdminTools.tsx` — health badges, check buttons, filter
- **Update**: `src/pages/admin/AdminDashboard.tsx` — health summary widget

