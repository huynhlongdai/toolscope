

## Plan: Đồng bộ 2 chiều Database với Supabase bên ngoài

### Tổng quan
Tạo hệ thống cho phép admin cấu hình một project Supabase bên ngoài, sau đó push/pull/sync dữ liệu giữa Lovable Cloud và project đó. Dùng `updated_at` để resolve conflict.

### Yêu cầu secrets
- `EXTERNAL_SUPABASE_URL` và `EXTERNAL_SUPABASE_SERVICE_KEY` — admin nhập qua giao diện, lưu vào Edge Function secrets.

### Thay đổi

**1. Migration: Bảng `sync_logs`**
Lưu lịch sử mỗi lần sync: direction, tables, rows pushed/pulled, conflicts, status, errors.

**2. Edge Function: `sync-database`**
- Nhận `direction` (push/pull/both), `tables` (danh sách bảng)
- Kết nối tới Supabase ngoài qua `EXTERNAL_SUPABASE_URL` + `EXTERNAL_SUPABASE_SERVICE_KEY`
- Push: query local → upsert external
- Pull: query external → upsert local
- Both: chạy cả 2 chiều, so sánh `updated_at` để giữ bản mới nhất
- Ghi kết quả vào `sync_logs`
- Hỗ trợ 17 bảng từ BACKUP_TABLES

**3. Trang Admin: `AdminSync.tsx`**
- Form nhập External Supabase URL + Service Key (lưu vào site_settings, key sensitive lưu qua secrets)
- Nút "Test Connection"
- Checkbox chọn bảng cần sync
- Chọn hướng: Push / Pull / Cả hai
- Nút "Chạy đồng bộ" với progress
- Bảng lịch sử sync từ `sync_logs`

**4. Cập nhật `App.tsx`**: Thêm route `/admin/sync` → `AdminSync`

### File thay đổi
1. Migration: tạo bảng `sync_logs` + RLS (admin only)
2. Tạo: `supabase/functions/sync-database/index.ts`
3. Tạo: `src/pages/admin/AdminSync.tsx`
4. Sửa: `src/App.tsx` — thêm route + import

