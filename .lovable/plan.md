

## Plan nâng cấp từng phần Admin Panel

### Tổng quan hiện trạng

| Module | Lines | Đánh giá | Ưu tiên |
|---|---|---|---|
| **Dashboard** | 200 | Cơ bản, thiếu realtime, thiếu activity feed chi tiết | Cao |
| **Analytics** | 259 | Ổn, thiếu engagement metrics, retention | Trung bình |
| **Tools** | 1737 | Đầy đủ nhất, có health check, translation, batch import | Thấp |
| **Blog** | 717 | Ổn, có AI generate, translation | Thấp |
| **Workflows** | 693 | Vừa nâng cấp translation | Thấp |
| **Categories** | 249 | Cơ bản, thiếu drag-drop sort, merge, icon picker | Cao |
| **Pages** | 102 | Rất mỏng, chỉ list + delete, dùng prompt() tạo page | Cao |
| **Deals** | Vừa nâng cấp | Đã có collect, translate, analytics | Thấp |
| **Launches** | 196 | Cơ bản, thiếu search, bulk actions, detail view | Trung bình |
| **Tasks** | 270 | Cơ bản, thiếu bulk assign, AI suggest | Trung bình |
| **Users** | 372 | Thiếu bulk ban, export, activity timeline | Trung bình |
| **Reviews** | 152 | Rất mỏng, chỉ list + status + delete | Cao |
| **Moderation** | 198 | Cơ bản, thiếu keyword filter, auto-flag | Trung bình |
| **Reports** | 173 | Cơ bản, đủ dùng | Thấp |
| **Newsletter** | 174 | Cơ bản, thiếu compose/send, segments | Trung bình |
| **SearchAnalytics** | 523 | Khá đầy đủ | Thấp |
| **Settings** | 964 | Vừa nâng cấp AI provider | Thấp |
| **Backup** | 224 | Đủ dùng | Thấp |

---

### Đợt 1 — Các module yếu nhất (ưu tiên cao)

#### 1.1 AdminDashboard — Nâng cấp overview
- Thêm stat cards: Workflows, Blog posts, Translations coverage %
- **Activity feed realtime**: Dùng `supabase_realtime` trên `audit_logs` để hiển thị live activity
- **System health summary**: Tổng hợp AI usage (7 ngày), storage usage, edge function errors
- **Quick action buttons**: Thêm "Dịch tất cả", "Check health", "Tạo blog AI"
- Thêm biểu đồ đường cho views tổng hợp 7 ngày gần nhất

#### 1.2 AdminReviews — Mở rộng đáng kể
- Thêm **search** theo title/tool name/author
- Thêm **detail view dialog**: hiển thị full content, pros/cons, structured ratings
- **Bulk actions**: Bulk approve, bulk delete (checkbox + action bar)
- **Reply/Vendor response**: Admin có thể reply trực tiếp vào review
- Hiển thị structured rating breakdown (ease_of_use, value_for_money...) trong table

#### 1.3 AdminCategories — UX cải thiện
- **Drag-drop reorder** sort_order (hoặc nút move up/down đơn giản)
- **Merge categories**: Chọn 2 categories → merge tools vào 1
- **Icon picker**: Dropdown chọn icon thay vì nhập text
- **Tool count**: Hiển thị số tools trong mỗi category
- **Bulk delete tags** với checkbox

#### 1.4 AdminPages — Cải thiện cơ bản
- Thay thế `prompt()` bằng **Dialog form** chính thống
- Thêm **status filter** (draft/published)
- Thêm **duplicate page** action
- Hiển thị **last updated**, **slug** trong bảng
- Nút **preview** mở page ở tab mới

---

### Đợt 2 — Cải thiện UX và tính năng (ưu tiên trung bình)

#### 2.1 AdminUsers — Quản lý nâng cao
- **Activity timeline**: Dialog xem lịch sử hoạt động user (reviews, comments, questions)
- **Bulk actions**: Bulk ban, bulk change role
- **User detail card**: Hiển thị stats tổng hợp (reputation, reviews, comments)
- **Export users** ra CSV với filter
- **Search** cải thiện: filter by ban status

#### 2.2 AdminLaunches — Hoàn thiện
- Thêm **search** theo product_name/tagline
- **Bulk approve/reject** với checkbox
- **Statistics card**: Tổng launches, approved rate, average upvotes
- Cải thiện **detail dialog**: hiển thị screenshots, video, features

#### 2.3 AdminTasks — Cải thiện
- **Bulk assign tools**: Chọn nhiều tools → assign vào task
- **AI suggest tasks**: Dựa trên tool descriptions, suggest tasks phù hợp
- **Reorder drag-drop** hoặc nút sort
- **Tool count live**: Đếm realtime thay vì field tĩnh

#### 2.4 AdminNewsletter — Compose & send
- **Compose email**: Form soạn email với RichTextEditor
- **Segments**: Filter subscribers by date range, active status
- **Send preview**: Gửi test email đến admin trước khi gửi hàng loạt
- **Stats**: Open rate, click rate (nếu tích hợp email service)

#### 2.5 AdminModeration — Auto-moderation
- **Keyword blacklist**: Danh sách từ khóa tự động flag
- **Auto-flag**: Comments/reviews chứa keywords bị flag tự động
- **Moderation queue count** trên sidebar badge
- **Bulk approve/delete** comments

---

### Đợt 3 — Polish & minor (ưu tiên thấp)

#### 3.1 AdminAnalytics — Mở rộng
- Thêm **engagement metrics**: Avg time on page, bounce rate (nếu có analytics)
- **Deals analytics**: Revenue potential, top deals by clicks
- **Comparison charts**: So sánh metrics giữa 2 khoảng thời gian

#### 3.2 AdminAuditLogs — Cải thiện filter
- Filter theo **entity_type**, **action**, **user**
- **Undo action**: Với một số action đơn giản (status change), cho phép revert

#### 3.3 AdminLayout — Sidebar badges
- Hiển thị **badge count** trên sidebar cho: pending tools, pending reports, pending launches
- **Collapse persist**: Lưu trạng thái collapse sidebar vào localStorage

---

### Thứ tự triển khai đề xuất

Mỗi đợt có thể chia nhỏ thành từng module riêng. Đề xuất bắt đầu từ đợt 1:

1. **AdminDashboard** — Nâng cấp overview + realtime activity
2. **AdminReviews** — Search, detail view, bulk actions
3. **AdminCategories** — Reorder, merge, icon picker, tool count
4. **AdminPages** — Dialog form, status filter, duplicate

Sau đó tiếp tục đợt 2 và 3 theo thứ tự ưu tiên.

### Technical Notes
- Realtime activity trên Dashboard cần `ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs`
- Merge categories cần migration update `tools.category_id` trước khi delete category
- Newsletter compose cần edge function gửi email (hoặc tích hợp Resend/SendGrid)
- Sidebar badges cần query count riêng, cache bằng react-query với staleTime ngắn

