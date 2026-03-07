

## Nâng cấp Search Analytics - Auto-create Rules từ Search Logs

### Ý tưởng cốt lõi

Khi một từ khóa (hoặc nhóm từ khóa tương tự) được tìm kiếm nhiều lần vượt ngưỡng do admin cài đặt, hệ thống sẽ **tự động tạo search rule** ghim tool phù hợp nhất. Lần tìm kiếm tiếp theo với từ khóa đó sẽ trả kết quả từ rule (pinned tools) thay vì gọi AI, **tiết kiệm credit AI**.

### Luồng hoạt động

```text
User tìm kiếm "design tool"
        │
        ▼
ai-search edge function
        │
        ├── Check search_rules → Có rule? → Trả pinned tools (KHÔNG gọi AI)
        │
        └── Không có rule → Gọi AI → Trả kết quả
                                │
                                └── Lưu kết quả vào search_logs
                                        │
                                        ▼
                          (Cron / Manual trigger)
                    analyze-search-patterns edge function
                                        │
                    ┌───────────────────┘
                    ▼
        1. Đếm tần suất từ khóa tương tự (AI phân cụm)
        2. Nếu vượt ngưỡng → Tạo search_rule tự động
        3. Ghim top tools từ kết quả AI trước đó
```

### Kế hoạch thực hiện

#### 1. Thêm cài đặt ngưỡng (site_settings)
- Key: `auto_rule_threshold` — số lượt tìm kiếm tối thiểu để tự động tạo rule (mặc định: 10)
- Key: `auto_rule_enabled` — bật/tắt tính năng
- UI cài đặt ngay trong tab "Rules" của Search Analytics

#### 2. Mở rộng bảng `search_logs`
- Thêm cột `matched_tool_ids` (uuid[]) — lưu danh sách tool ID mà AI trả về cho mỗi lần tìm kiếm
- Dùng dữ liệu này để biết nên ghim tool nào khi tạo rule tự động

#### 3. Mở rộng bảng `search_rules`
- Thêm cột `is_auto` (boolean, default false) — đánh dấu rule do AI tạo tự động
- Thêm cột `source_keywords` (text[]) — danh sách các biến thể từ khóa gốc đã được gom nhóm

#### 4. Tạo Edge Function `analyze-search-patterns`
- Lấy search_logs gần đây (chưa có rule tương ứng)
- Gom nhóm từ khóa tương tự bằng AI (Gemini flash-lite cho rẻ):
  - Input: danh sách unique keywords + số lần xuất hiện
  - Output: các cụm từ khóa đồng nghĩa (VD: "design tool", "công cụ thiết kế", "tool thiết kế" → 1 cụm)
- Với mỗi cụm vượt ngưỡng:
  - Tổng hợp `matched_tool_ids` phổ biến nhất từ logs
  - Tạo `search_rule` với `match_type: "contains"`, `pinned_tool_ids` = top tools, `is_auto: true`
- Trả về báo cáo: bao nhiêu rule mới được tạo

#### 5. Cập nhật `ai-search` Edge Function
- Sau khi gọi AI thành công, lưu `matched_tool_ids` vào `search_logs` (update row vừa insert)
- Khi rule khớp và có pinned tools → **bỏ qua gọi AI**, trả kết quả trực tiếp từ DB

#### 6. Nâng cấp UI Search Analytics (`AdminSearchAnalytics.tsx`)
- **Tab Rules**: 
  - Thêm section "Cài đặt tự động" với input ngưỡng + switch bật/tắt
  - Badge `Auto` cho rule tự động, hiển thị `source_keywords`
  - Nút "Phân tích & tạo rule" (trigger manual edge function)
  - Thống kê: số rule auto vs manual, ước tính credit tiết kiệm
- **Tab Overview**: Thêm card "Credit tiết kiệm" (= số lần rule match thay AI)
- **Mobile**: Đảm bảo responsive cho các section mới

### Technical Details

**Files tạo mới:**
- `supabase/functions/analyze-search-patterns/index.ts`

**Files chỉnh sửa:**
- `supabase/functions/ai-search/index.ts` — lưu matched_tool_ids, tối ưu rule-match flow
- `src/pages/admin/AdminSearchAnalytics.tsx` — UI cài đặt ngưỡng, badge auto rule, nút trigger
- `supabase/config.toml` — thêm config cho function mới

**DB Migration:**
- `ALTER TABLE search_logs ADD COLUMN matched_tool_ids uuid[] DEFAULT '{}'`
- `ALTER TABLE search_rules ADD COLUMN is_auto boolean DEFAULT false`
- `ALTER TABLE search_rules ADD COLUMN source_keywords text[] DEFAULT '{}'`

