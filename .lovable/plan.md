

## ToolScope - Kế hoạch triển khai đầy đủ

### Tổng quan
Website đa ngôn ngữ tổng hợp & review công cụ toàn cầu. Kết hợp nội dung biên tập chuyên sâu với đánh giá cộng đồng, tích hợp AI toàn diện cho thu thập dữ liệu, viết bài, đánh giá và tư vấn. Responsive web, hỗ trợ dark/light mode.

---

### 🏠 TRANG CÔNG KHAI

**1. Trang chủ**
- Hero banner + thanh tìm kiếm AI thông minh (ngôn ngữ tự nhiên)
- Section "AI Recommended Tools" với badge
- Danh mục công cụ (AI, Design, Dev, Marketing, Productivity...)
- Tool nổi bật / trending / mới nhất
- Bộ lọc theo danh mục, rating, giá, tags
- "For You" feed cá nhân hóa
- Nút chuyển ngôn ngữ + Dark/Light mode

**2. Trang chi tiết công cụ**
- Thông tin tổng quan: tên, logo, mô tả, website, pricing tiers
- AI Score card (điểm theo tiêu chí + tóm tắt ưu/nhược)
- Badge "AI Recommended" nếu đạt chuẩn
- Bài review chi tiết từ editor (markdown, ảnh, video embed)
- Đánh giá sao 1-5 từ cộng đồng + upvote/downvote
- Bình luận threaded (trả lời lồng nhau)
- Q&A section với upvote câu trả lời hay nhất
- Danh sách alternatives (tool tương tự)
- "Works well with" integrations
- Nút Bookmark, Share, Follow
- Pricing history chart + alert giảm giá

**3. Trang so sánh công cụ**
- Chọn 2-4 tool để so sánh side-by-side
- Bảng so sánh tính năng, giá, rating, AI score
- AI tự động tạo kết luận & đề xuất
- ROI Calculator: nhập team size → tính chi phí

**4. Trang danh sách & tìm kiếm**
- Grid/list view toggle
- Bộ lọc nâng cao (danh mục, giá, rating, tags, platform, integrations)
- Sắp xếp: phổ biến, mới nhất, đánh giá cao, AI score
- Infinite scroll + skeleton loading
- Search history, auto-complete, popular searches
- Voice search (Web Speech API)

**5. Trang danh mục**
- Mỗi danh mục có landing page riêng + mô tả + top tools
- Sub-categories (VD: AI → Chatbot, Image Gen, Code Assistant...)

**6. Trang Trending**
- Tools đang trending tuần/tháng
- "Rising Stars" - tools mới nổi tăng rating nhanh
- Biểu đồ xu hướng popularity theo thời gian

**7. Trang Use Cases & Workflows**
- Mô tả workflow cụ thể (VD: "Content Marketing Workflow")
- Mỗi use case gợi ý combo tools phù hợp
- User submit workflow + tools đang dùng

**8. Trang Collections & Lists**
- User tạo collection tool theo chủ đề
- Editor tạo "Curated Lists" (Top 10 AI Tools...)
- "Stack" - user chia sẻ bộ tools đang dùng hàng ngày
- Collections công khai có thể upvote

**9. Trang Profile người dùng**
- Reviews đã viết, câu hỏi, tools bookmarked, collections
- Reputation score + badges ("Top Reviewer", "Early Adopter", "Expert")
- Lịch sử hoạt động
- Recently viewed tools

**10. Trang Blog/Tin tức**
- Bài viết về xu hướng công cụ mới
- AI tóm tắt tin tự động
- Weekly digest

---

### 🤖 TÍNH NĂNG AI

**1. AI Search thông minh**
- Gõ nhu cầu bằng ngôn ngữ tự nhiên (VD: "tool thiết kế miễn phí cho startup")
- AI hiểu ngữ cảnh, gợi ý tools phù hợp + lý do
- "Similar to [tool X]" search

**2. Chatbot tư vấn AI**
- Widget chat floating trên mọi trang
- Hỏi đáp, so sánh, tư vấn lựa chọn tool
- Streaming response token-by-token
- Trả lời dựa trên dữ liệu tools trong database

**3. AI Thu thập dữ liệu tự động**
- Admin dán URL → Firecrawl scrape → AI parse (tên, mô tả, pricing, tính năng, logo)
- Tự điền form thêm tool mới
- Scheduled re-scrape hàng tuần phát hiện thay đổi
- User submit URL tool → AI thu thập → Admin duyệt

**4. AI Hỗ trợ viết bài review**
- Chọn tool → AI tạo draft (giới thiệu, tính năng, ưu/nhược, kết luận)
- Editor chỉnh sửa → xuất bản
- AI dịch tự động sang ngôn ngữ khác

**5. AI Đánh giá & chấm điểm**
- Phân tích: dữ liệu scrape + review editor + rating cộng đồng
- Điểm theo tiêu chí: Dễ sử dụng, Tính năng, Giá cả, Hỗ trợ, Hiệu suất
- Tóm tắt ưu/nhược bằng AI
- Badge "AI Recommended"

**6. AI Spam Detection**
- Tự động phát hiện comment/review spam
- Flag nội dung nghi vấn cho admin

**7. AI Personalization**
- Onboarding quiz → gợi ý tools theo lĩnh vực
- "Because you liked [X]" recommendations

---

### 🔐 HỆ THỐNG NGƯỜI DÙNG

- Đăng ký/đăng nhập: Email + Google OAuth
- Vai trò (bảng `user_roles` riêng): Admin, Editor, User
- **User**: đánh giá, bình luận, Q&A, bookmark, upvote/downvote, tạo collections, follow tools/users/categories, submit tools
- **Editor**: viết/chỉnh sửa review, dùng AI draft, quản lý collections
- **Admin**: toàn quyền

**Gamification**
- Điểm reputation (viết review, Q&A, upvote nhận được)
- Badges: "Top Reviewer", "Early Adopter", "Helpful Answer", "Expert"
- Leaderboard contributors hàng tháng

---

### 📊 ADMIN DASHBOARD

**Quản lý cơ bản**
- CRUD tools, categories, tags, blog posts
- Quản lý users, phân quyền role
- Quản lý reviews, bình luận, Q&A
- Bulk import tools từ CSV

**Analytics & Dashboard**
- Thống kê lượt xem ngày/tuần/tháng (biểu đồ Recharts)
- Top tools phổ biến, user activity, đăng ký mới
- Top contributors
- Revenue tracking (nếu affiliate)

**Content Moderation**
- Hàng đợi duyệt: reviews, bình luận, câu hỏi, tool submissions
- Hệ thống báo cáo spam/vi phạm
- Approve/reject/flag + AI spam detection
- Audit log mọi thao tác admin/editor

**AI Management**
- Nút "Auto-collect từ URL" khi thêm tool
- Nút "Generate AI Draft" khi tạo review
- Xem/chỉnh sửa AI scores
- Log các lần AI scrape/generate
- Scheduled re-scrape settings

**Quản lý đa ngôn ngữ**
- Trạng thái dịch mỗi bài (đã dịch/chưa)
- Trigger dịch lại khi nội dung thay đổi
- Chỉnh sửa bản dịch thủ công

---

### 🌐 ĐA NGÔN NGỮ TỰ ĐỘNG

- Selector ngôn ngữ trên header (Vi/En, mở rộng thêm)
- Editor viết 1 ngôn ngữ → AI dịch tự động
- URL routing: `/vi/tool/...`, `/en/tool/...`
- Bảng `translations` lưu bản dịch
- Hreflang tags + canonical URLs cho SEO

---

### 🔔 THÔNG BÁO & FOLLOW

- Follow tool → thông báo review mới, thay đổi pricing
- Follow user/editor → thông báo review mới
- Follow category → tool mới trong danh mục
- Thông báo in-app + email digest tùy chọn
- Price drop alerts

---

### 📱 MOBILE RESPONSIVE

- Mobile-first responsive design
- Bottom navigation bar (Home, Search, Bookmarks, Profile)
- Collapsible filters
- Pull-to-refresh, infinite scroll
- Skeleton loading states
- Touch-friendly rating, buttons
- Share sheet native
- "Quick Rate" swipe cards
- Lazy loading images
- Sticky header thu gọn khi scroll

---

### 📈 SEO & GROWTH

- Auto-generate sitemap XML
- Structured data JSON-LD cho Rich Snippets
- Open Graph social cards tự động
- Hreflang tags đa ngôn ngữ
- Canonical URLs
- Newsletter đăng ký email weekly digest

---

### 🏗️ BACKEND (Lovable Cloud + Supabase)

**Database tables**: tools, categories, tags, tool_tags, reviews, ratings, comments, questions, answers, votes, bookmarks, collections, collection_items, translations, ai_scores, user_roles, profiles, notifications, reports, follows, pricing_history, workflows, blog_posts, audit_logs

**Edge Functions**:
- `collect-tool-data`: Firecrawl scrape + AI parse
- `generate-review`: AI tạo draft review
- `evaluate-tool`: AI chấm điểm
- `translate-content`: AI dịch đa ngôn ngữ
- `ai-search`: Tìm kiếm thông minh
- `ai-chat`: Chatbot tư vấn (streaming)
- `detect-spam`: AI phát hiện spam

**Auth + RLS**: Phân quyền theo role, security definer functions

---

### 📋 THỨ TỰ TRIỂN KHAI

1. ✅ Database schema + Auth + Roles
2. ✅ Trang chủ + Danh sách tools + Chi tiết tool (responsive)
3. ✅ Review, Rating, Bình luận, Q&A, Upvote/Downvote
4. ✅ AI Search + Chatbot tư vấn
5. ✅ AI thu thập + viết bài + đánh giá (Firecrawl)
6. ✅ So sánh tools + Pricing tracker
7. ✅ Collections, Bookmarks, Follow, Notifications
8. ✅ Admin dashboard đầy đủ + Moderation
9. ✅ Đa ngôn ngữ tự động
10. ✅ Trending, Gamification, Personalization
11. ✅ Use Cases, Integrations map, Blog
12. ✅ SEO optimization + Mobile polish

---

### 🆕 TÍNH NĂNG MỞ RỘNG (Học hỏi G2, Capterra, Product Hunt, AlternativeTo, TAAFT)

13. ✅ Structured Review Form (đánh giá theo tiêu chí ease_of_use, value_for_money, customer_support, NPS)
14. ✅ Alternatives Section (AI gợi ý + user vote "I switched from X to Y")
15. ✅ G2 Grid Quadrant Chart (Satisfaction vs Market Presence trên Category page)
16. ✅ Screenshot Gallery (slider + lightbox trên Tool Detail)
17. ✅ AI Score Auto-Generation (Edge Function + Admin button)
18. ✅ Task-Based Discovery (/tasks - chọn task tìm tool phù hợp)
19. ✅ Product Launch (/launches - submit + upvote sản phẩm mới mỗi ngày)
20. ✅ Vendor/Maker Profiles (claim tool, respond to reviews)
21. ✅ Analytics & Tracking Scripts (GA, custom scripts, admin settings page)
22. ✅ Newsletter Subscription (footer form + newsletter_subscribers table)
23. ✅ SEOHead nâng cao (hreflang tags + twitter:card meta tags)
24. ✅ Audit Logs table (tracking admin actions)
25. ✅ Reports table (user spam/content reporting)

### 📌 BACKLOG (Chưa triển khai)

- Seasonal Awards / Best Of (auto-generate top tools theo quý/năm)
- Discussion Forum / Threads
- AI Agents Directory
- Tool Changelog / Update Timeline
- Company Profiles
- AI Model Directory
- Job Impact Index
- Fundraise Tracker
- Mini Tools / Interactive Demos
- Comparison Advisor (AI chatbot chuyên so sánh)
- Verified Reviews (badge "Verified User")
