

## Ý tưởng phát triển ToolScope - Học hỏi từ G2, Capterra, Product Hunt, AlternativeTo, TAAFT

Sau khi phân tích 5 nền tảng lớn, dưới đây là các tính năng ToolScope **chưa có** mà nên bổ sung, chia theo mức độ ưu tiên.

---

### A. Tính năng cao giá trị (High Impact)

**1. G2 Grid / Quadrant Chart** (theo G2)
- Biểu đồ 2 trục: Satisfaction (trục Y) vs Market Presence (trục X)
- Mỗi tool là 1 chấm tròn, chia 4 góc: Leaders, High Performers, Contenders, Niche
- Lọc theo danh mục, hiển thị trên trang Category
- Sử dụng Recharts scatter plot, dữ liệu từ avg_rating + view_count + rating_count

**2. Verified Reviews / Review Quality System** (theo G2 + Capterra)
- Badge "Verified User" cho review từ user đã xác minh email
- Review phải trả lời câu hỏi có cấu trúc: "What do you like best?", "What do you dislike?", "What problems solved?"
- Hiển thị thông tin reviewer: vai trò, quy mô công ty, ngành nghề
- Review helpfulness voting ("Was this review helpful? Yes/No")

**3. "Alternatives To" Section** (theo AlternativeTo)
- Mỗi tool có section "Alternatives" với danh sách tool tương tự
- User vote "I switched from X to Y" - tracking migration patterns
- AI tự gợi ý alternatives dựa trên cùng category + tags
- Bảng `tool_alternatives` lưu cặp tool_id + alternative_id + vote_count

**4. Vendor/Maker Profiles** (theo G2 "Claim Your Profile")
- Cho phép vendor claim tool profile của họ
- Vendor có thể trả lời reviews, cập nhật thông tin
- Badge "Claimed by Vendor" trên tool card
- Bảng `vendor_claims` với trạng thái pending/approved

**5. Task-Based Discovery** (theo TAAFT)
- Thay vì chỉ browse theo category, user chọn "task" cần làm
- VD: "Generate images", "Write content", "Build website"
- Bảng `tasks` + `tool_tasks` mapping tool cho từng task
- Trang `/tasks` với grid các task phổ biến

---

### B. Tính năng tăng engagement (Medium Impact)

**6. Product Launch / Submit Tool** (theo Product Hunt)
- User submit tool mới với mô tả, screenshots
- Cộng đồng upvote trong "Launch Day"
- Trang `/launches` hiển thị tools mới submit theo ngày
- Maker có thể comment giới thiệu tool của mình

**7. Discussion Forum / Threads** (theo Product Hunt)
- Forum thảo luận theo topic: "Best tool for X?", "X vs Y?"
- Upvote threads, threaded replies
- Sidebar "Trending Forum Threads" trên trang chủ

**8. Seasonal Awards / Best Of** (theo G2 "Best Software Awards 2026")
- Trang `/best` hiển thị Top tools theo quý/năm
- Badge "Best of 2026" trên tool card
- Auto-generate dựa trên rating + review count trong period
- Chia theo category

**9. AI Agents Directory** (theo TAAFT)
- Section riêng cho AI Agents (không chỉ tools)
- Filter: autonomous vs semi-autonomous, use case
- Tag system riêng cho agents

**10. Tool Changelog / Update Timeline** (theo AlternativeTo News)
- Mỗi tool có timeline cập nhật: "v2.0 released", "New feature X added"
- AI auto-scrape changelog từ website tool
- User follow tool nhận notification khi có update
- Hiển thị dạng timeline trên tool detail page

---

### C. Tính năng monetization & growth (Nice to Have)

**11. Company Profiles** (theo TAAFT)
- Trang `/companies` - hiển thị các công ty và tất cả tools của họ
- Thông tin: funding, team size, headquarters
- Bảng `companies` + foreign key từ `tools.company_id`

**12. AI Model Directory** (theo TAAFT)
- Trang `/models` - danh sách AI models (GPT-5, Gemini, Claude...)
- Tools nào dùng model nào
- So sánh models side-by-side

**13. Job Impact Index** (theo TAAFT)
- Đánh giá mức độ AI tool ảnh hưởng đến từng nghề
- Biểu đồ: "AI Impact Score" cho từng ngành

**14. Fundraise Tracker** (theo TAAFT)
- Track các vòng gọi vốn của tool/company
- Timeline: Seed → Series A → B...
- Filter tools theo funding stage

**15. Mini Tools / Interactive Demos** (theo TAAFT)
- Embed mini demo trực tiếp trên trang (free text-to-speech, image gen...)
- Cho user thử trước khi quyết định dùng tool

---

### D. Cải thiện UX hiện có

**16. Structured Review Form** (theo Capterra + G2)
- Thay form review tự do bằng form có cấu trúc:
  - Overall rating (1-5)
  - Ease of use (1-5)
  - Customer support (1-5)  
  - Value for money (1-5)
  - Likelihood to recommend (1-10 NPS)
  - Pros (text), Cons (text), Use case (text)
- Hiển thị breakdown bar chart trên tool detail

**17. Comparison Advisor** (theo Capterra "1-on-1 Advice")
- AI chatbot chuyên so sánh: "Nên dùng Notion hay ClickUp cho team 10 người?"
- Trả lời dựa trên dữ liệu reviews + pricing + features trong DB

**18. Screenshot Gallery** (mọi platform đều có)
- Upload nhiều screenshots cho mỗi tool
- Gallery slider trên tool detail page
- Bảng `tool_screenshots` (tool_id, image_url, caption, order)

---

### Tóm tắt ưu tiên đề xuất

| Ưu tiên | Tính năng | Lý do |
|---------|-----------|-------|
| 1 | Structured Review Form | Tăng chất lượng review, giống G2/Capterra |
| 2 | Alternatives Section | Core feature của AlternativeTo, rất hữu ích |
| 3 | G2 Grid Chart | Trực quan, differentiator mạnh |
| 4 | Screenshot Gallery | Mọi platform đều có, thiếu là điểm yếu |
| 5 | Task-Based Discovery | UX innovation từ TAAFT |
| 6 | Product Launch/Submit | Community-driven growth từ Product Hunt |
| 7 | Verified Reviews | Trust & credibility |
| 8 | Seasonal Awards | SEO + engagement boost |

