

## Plan: Đồng bộ tự động hai chiều (Auto Bidirectional Sync)

### Vấn đề
Hiện tại sync chỉ chạy thủ công khi admin nhấn nút. User muốn dữ liệu tự động đồng bộ song song — khi thêm/sửa ở bên nào thì bên kia cũng cập nhật.

### Giải pháp
Sử dụng **pg_cron** để tự động gọi edge function `sync-database` theo lịch (mặc định mỗi 5 phút), luôn ở chế độ `both` (hai chiều) và sử dụng `lastSyncAt` để chỉ sync dữ liệu mới.

### Thay đổi

**1. Cập nhật Edge Function `sync-database/index.ts`**
- Thêm hỗ trợ header `x-cron-key` để pg_cron gọi mà không cần user token (dùng `SUPABASE_SERVICE_ROLE_KEY` làm key xác thực)
- Khi gọi từ cron: tự động lấy `lastSyncAt` từ sync_logs gần nhất, direction = `both`, tables = tất cả

**2. Cập nhật Admin UI (`AdminSync.tsx`)**
- Thêm section "Đồng bộ tự động" với toggle bật/tắt
- Cho phép chọn tần suất: 5 phút / 15 phút / 30 phút / 1 giờ
- Hiển thị trạng thái: đang bật/tắt, lần sync gần nhất
- Lưu cấu hình vào `site_settings` (key: `auto_sync_config`)

**3. Tạo cron job bằng pg_cron + pg_net**
- Enable extensions `pg_cron` và `pg_net`
- Tạo cron job gọi `sync-database` function tự động
- Cron job sẽ gửi request POST với service role key

**4. Edge function hỗ trợ quản lý cron**
- Thêm endpoint trong `sync-database` để admin bật/tắt/thay đổi tần suất cron qua `action: "enable_auto" | "disable_auto" | "update_interval"`

### Luồng hoạt động

```text
[pg_cron] --every 5min--> [sync-database edge fn]
                              |
                    lastSyncAt from sync_logs
                              |
              +---------------+---------------+
              |                               |
     Push (local→external)          Pull (external→local)
     chỉ rows mới/updated          chỉ rows mới/updated
```

### Chi tiết kỹ thuật

- **Incremental sync**: Mỗi lần cron chạy, lấy `completed_at` của sync_logs gần nhất làm `lastSyncAt` → chỉ sync dữ liệu thay đổi sau thời điểm đó
- **Conflict resolution**: Giữ nguyên logic hiện tại — bản có `updated_at` mới hơn sẽ thắng
- **Cron authentication**: Dùng service role key trong header thay vì user token
- **Bảng không có `updated_at`** (tags, tool_tags, follows, user_roles): Full upsert mỗi lần — an toàn vì dùng `ON CONFLICT`

### File thay đổi
1. **Sửa**: `supabase/functions/sync-database/index.ts` — thêm cron auth + auto-sync mode + cron management
2. **Sửa**: `src/pages/admin/AdminSync.tsx` — thêm UI bật/tắt auto sync
3. **Migration**: Enable `pg_cron`, `pg_net` extensions + tạo cron job

