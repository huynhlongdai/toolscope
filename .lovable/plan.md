

## Plan nâng cấp module Launches

### Hiện trạng
- Bảng `launches` có các trường cơ bản (product_name, tagline, description, launch_date, upvotes, status, features, screenshots, video_url, maker_comment)
- LaunchesPage: hiển thị grouped by date, upvote, submit form
- AdminLaunches: CRUD, search, bulk approve/reject, stats, detail dialog
- Chưa có: countdown, đăng ký nhận thông báo, scheduled launch, trial signup, comments, share

### Thay đổi đề xuất

#### 1. Database migration — bảng `launch_subscribers` + cột mới trên `launches`

```sql
-- Bảng đăng ký nhận thông báo launch
CREATE TABLE public.launch_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id uuid NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  user_id uuid, -- null = email subscriber
  email text,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(launch_id, user_id),
  UNIQUE(launch_id, email)
);

-- Bảng comments cho launches
CREATE TABLE public.launch_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id uuid NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES launch_comments(id),
  content text NOT NULL,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Thêm cột mới vào launches
ALTER TABLE launches 
  ADD COLUMN scheduled_at timestamptz,
  ADD COLUMN trial_url text,
  ADD COLUMN subscriber_count integer DEFAULT 0,
  ADD COLUMN is_coming_soon boolean DEFAULT false;

-- RLS policies
ALTER TABLE public.launch_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_comments ENABLE ROW LEVEL SECURITY;

-- launch_subscribers policies
CREATE POLICY "Users can subscribe" ON launch_subscribers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsubscribe" ON launch_subscribers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscribers" ON launch_subscribers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Subscriber counts viewable" ON launch_subscribers FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- launch_comments policies  
CREATE POLICY "Comments viewable by all" ON launch_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON launch_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own" ON launch_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users/admins can delete" ON launch_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Realtime cho launch_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.launch_comments;
```

#### 2. LaunchesPage.tsx — Nâng cấp giao diện public

- **Countdown timer**: Với launches có `scheduled_at` trong tương lai, hiển thị đếm ngược (ngày:giờ:phút:giây)
- **"Coming Soon" section**: Hiển thị riêng các launch chưa đến ngày (is_coming_soon=true hoặc scheduled_at > now)
- **Subscribe button**: Nút "🔔 Nhận thông báo" cho mỗi launch — insert vào `launch_subscribers`
- **Trial signup**: Nút "Dùng thử" link tới `trial_url` nếu có
- **Share buttons**: Tích hợp ShareButtons component có sẵn
- **Tab navigation**: "Hôm nay" / "Tuần này" / "Sắp ra mắt"
- **Launch detail page**: Click vào launch mở trang chi tiết với comments, gallery, maker profile

#### 3. LaunchDetailPage.tsx — Trang chi tiết launch (MỚI)

- Hero section: Logo, tên, tagline, countdown (nếu scheduled), upvote button lớn
- Gallery: Screenshots carousel + video embed
- Description section với maker comment highlight
- Features list
- Trial signup CTA
- Subscribe/notify button
- Comment section (realtime) — dùng `launch_comments`
- Share buttons
- Related launches sidebar

#### 4. LaunchSubmitForm.tsx — Bổ sung trường mới

- Thêm `scheduled_at` date picker — cho phép đặt lịch launch
- Thêm `trial_url` — link dùng thử
- Thêm `is_coming_soon` toggle

#### 5. AdminLaunches.tsx — Nâng cấp admin

- Hiển thị subscriber_count trong bảng
- Tab "Coming Soon": Quản lý launches scheduled
- Schedule management: Admin có thể thay đổi scheduled_at
- Notify subscribers: Nút gửi thông báo đến tất cả subscribers khi launch go live
- Comment moderation: Xem/xóa comments

#### 6. Components mới

- `LaunchCountdown.tsx`: Component đếm ngược reusable (useEffect interval)
- `LaunchSubscribeButton.tsx`: Subscribe/unsubscribe toggle
- `LaunchComments.tsx`: Comment section với realtime

### Files thay đổi

| File | Thay đổi |
|---|---|
| Migration SQL | Tạo `launch_subscribers`, `launch_comments`, cột mới trên `launches` |
| `src/pages/LaunchesPage.tsx` | Tabs, countdown, subscribe, coming soon section |
| `src/pages/LaunchDetailPage.tsx` | **Mới** — trang chi tiết launch |
| `src/components/launches/LaunchSubmitForm.tsx` | Thêm scheduled_at, trial_url |
| `src/components/launches/LaunchCountdown.tsx` | **Mới** — countdown timer |
| `src/components/launches/LaunchSubscribeButton.tsx` | **Mới** — subscribe toggle |
| `src/components/launches/LaunchComments.tsx` | **Mới** — comment section realtime |
| `src/pages/admin/AdminLaunches.tsx` | Tabs coming soon, notify, comment moderation |
| `src/App.tsx` | Route `/launch/:id` → LaunchDetailPage |

### Thứ tự triển khai

1. Migration (bảng + cột mới)
2. Components mới (Countdown, Subscribe, Comments)
3. LaunchDetailPage + route
4. LaunchesPage nâng cấp (tabs, countdown, subscribe)
5. LaunchSubmitForm bổ sung
6. AdminLaunches nâng cấp

