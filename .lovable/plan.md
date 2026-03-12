

## Plan: Chuyển đổi Database (Local / External)

### Ý tưởng
Cho phép admin chọn sử dụng database Local (Lovable Cloud) hoặc External (Supabase bên ngoài) làm database chính cho toàn bộ ứng dụng. Khi chuyển sang External, mọi truy vấn từ frontend sẽ đi qua Supabase bên ngoài thay vì local.

### Cách tiếp cận

Sử dụng **Vite alias** để chặn tất cả import từ `@/integrations/supabase/client` và chuyển hướng sang module mới có khả năng chuyển đổi client. **Không cần sửa 98 file** đang import supabase client.

```text
[98 files] --import--> @/integrations/supabase/client
                              |  (Vite alias redirect)
                              v
                     src/lib/database.ts
                       |           |
                  [Local Client]  [External Client]
                       ↑
              localStorage: "active_db"
              localStorage: "external_supabase_url"
              localStorage: "external_supabase_key"
```

### Thay đổi

**1. Tạo `src/lib/database.ts`**
- Import client gốc từ `../../integrations/supabase/client` (relative path, bypass alias)
- Đọc localStorage để kiểm tra active database
- Nếu `active_db === "external"` → tạo client mới với URL/key external
- Export `supabase` + hàm `switchDatabase()` và `getActiveDb()`

**2. Cập nhật `vite.config.ts`**
- Thêm alias: `"@/integrations/supabase/client"` → `"./src/lib/database.ts"`
- Mọi import tự động đi qua module mới, zero changes to existing files

**3. Thêm UI vào `AdminSync.tsx`**
- Card "Cấu hình Database" ở đầu trang
- Radio/Select chọn: Local (Lovable Cloud) hoặc External (Supabase ngoài)
- Khi chọn External: hiện form nhập URL + Anon Key (publishable key, safe to store)
- Nút "Lưu & Chuyển đổi" → lưu vào localStorage + site_settings → reload trang
- Hiển thị badge database đang active

**4. Lưu cấu hình**
- `localStorage`: cho tốc độ khởi tạo client (trước khi React mount)
- `site_settings` (key: `active_database_config`): persistent backup, sync giữa các thiết bị

### Lưu ý quan trọng
- Anon key (publishable key) của external Supabase **an toàn** để lưu client-side
- Auth session sẽ **không** chia sẻ giữa 2 database — khi chuyển DB, user cần đăng nhập lại
- RLS policies trên external DB cần được setup trước (qua tính năng "Khởi tạo Schema" đã có)

### File thay đổi
1. **Tạo**: `src/lib/database.ts` — dynamic supabase client
2. **Sửa**: `vite.config.ts` — thêm alias redirect
3. **Sửa**: `src/pages/admin/AdminSync.tsx` — thêm UI chọn database

