

## Plan: Thêm tính năng cài đặt nhận thông báo

### Hiện trạng
- Hệ thống thông báo đã có bảng `notifications` với các type: `deal`, etc.
- Chưa có bảng lưu tùy chọn nhận thông báo của người dùng
- Chưa có UI để bật/tắt từng loại thông báo

### Thay đổi

**1. Migration: Tạo bảng `notification_preferences`**
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  notify_deals boolean DEFAULT true,
  notify_new_tools boolean DEFAULT true,
  notify_reviews boolean DEFAULT true,
  notify_comments boolean DEFAULT true,
  notify_follows boolean DEFAULT true,
  notify_launches boolean DEFAULT true,
  notify_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: users can read/update own preferences
-- Auto-create row via trigger on new user signup
```

**2. Cập nhật trigger `handle_new_user`**: Tự tạo row preferences mặc định khi user đăng ký.

**3. Tạo component `NotificationSettings.tsx`**: UI với Switch cho từng loại thông báo (Deals, Tools mới, Reviews, Comments, Follows, Launches, Hệ thống).

**4. Thêm tab/section vào `ProfilePage.tsx`**: Hiển thị cài đặt thông báo trong profile (chỉ khi xem profile của chính mình).

**5. Cập nhật `useNotifications.ts`**: Query preferences và filter thông báo theo preferences của user.

**6. Cập nhật trigger `notify_deal_followers`**: Check preferences trước khi tạo notification.

### File thay đổi
1. **Migration**: Tạo bảng + RLS + cập nhật trigger
2. **Tạo**: `src/components/notifications/NotificationSettings.tsx`
3. **Sửa**: `src/pages/ProfilePage.tsx` — thêm section cài đặt thông báo
4. **Sửa**: `src/hooks/useNotifications.ts` — thêm hook quản lý preferences

