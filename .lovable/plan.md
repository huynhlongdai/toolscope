

## Plan: Tự động tạo schema trên Supabase bên ngoài trước khi đồng bộ

### Vấn đề
Supabase bên ngoài chưa có tables nào, nên khi push data sẽ lỗi vì không có bảng để upsert.

### Giải pháp
Thêm tính năng **"Khởi tạo Schema"** vào hệ thống sync:

**1. Edge Function mới: `setup-external-db`**
- Kết nối tới external Supabase bằng `EXTERNAL_SUPABASE_SERVICE_KEY`
- Tạo các enum types cần thiết (`app_role`, `content_status`, `pricing_type`)
- Tạo tất cả 17+ bảng với đúng schema (columns, types, defaults, constraints)
- Sử dụng `CREATE TABLE IF NOT EXISTS` để an toàn khi chạy lại
- Trả về danh sách bảng đã tạo thành công / đã tồn tại

Lưu ý: Supabase JS client (PostgREST) không hỗ trợ DDL (CREATE TABLE). Giải pháp là dùng **postgres connection** trực tiếp qua `EXTERNAL_SUPABASE_DB_URL` (connection string dạng `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`).

**2. Cập nhật Admin UI (`AdminSync.tsx`)**
- Thêm nút **"Khởi tạo Database"** phía trên khu vực sync
- Hiển thị trạng thái: bảng nào đã tạo, bảng nào lỗi
- Yêu cầu user nhập thêm secret `EXTERNAL_SUPABASE_DB_URL`

**3. Yêu cầu secret mới**
- `EXTERNAL_SUPABASE_DB_URL`: Connection string của database bên ngoài (lấy từ Project Settings > Database > Connection string trong Supabase dashboard)

### Cách lấy DB URL
User vào Supabase dashboard của project bên ngoài → Settings → Database → Connection string (URI format):
`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### File thay đổi
1. **Tạo**: `supabase/functions/setup-external-db/index.ts` — DDL function tạo schema
2. **Sửa**: `src/pages/admin/AdminSync.tsx` — thêm nút khởi tạo DB + UI trạng thái
3. **Secret**: Yêu cầu `EXTERNAL_SUPABASE_DB_URL`

### Luồng sử dụng
1. Admin nhập `EXTERNAL_SUPABASE_DB_URL` (connection string)
2. Nhấn "Khởi tạo Database" → edge function tạo tất cả bảng trên external Supabase
3. Sau khi hoàn tất → nhấn "Chạy đồng bộ" như bình thường

