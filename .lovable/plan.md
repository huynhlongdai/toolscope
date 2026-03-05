

## Bổ sung danh mục công cụ AI - Tham khảo Futurepedia, TAAFT, AI Tower

### Hiện trạng
Hiện tại chỉ có **10 danh mục gốc**, không có danh mục con:
AI & Machine Learning, Design & Creative, Development, Marketing, Analytics, No-Code, Video & Media, Security, Productivity, Automation

### Danh mục cần bổ sung

Dựa trên Futurepedia (10 danh mục lớn, 50+ danh mục con), There's An AI For That (11,000+ tasks), và AI Tower, cần bổ sung:

**Thêm 10 danh mục gốc mới:**

| # | Tên | Slug | Icon | Mô tả |
|---|------|------|------|--------|
| 11 | Writing & Content | writing | ✍️ | Copywriting, blog, storytelling, paraphrasing |
| 12 | Image Generation | image-generation | 🎨 | Text-to-image, editing, enhancing, backgrounds |
| 13 | Audio & Music | audio | 🎵 | Text-to-speech, music generation, transcription, voice cloning |
| 14 | Chatbots & Assistants | chatbots | 💬 | Personal assistants, customer support bots, AI companions |
| 15 | Business & Finance | business | 💼 | Finance, HR, legal, project management |
| 16 | Education & Research | education | 📚 | Students, tutoring, research, summarization |
| 17 | SEO & Social Media | seo | 📈 | SEO optimization, social media management, scheduling |
| 18 | Data & Database | data | 🗄️ | SQL, data analysis, ETL, data visualization |
| 19 | E-commerce | ecommerce | 🛒 | Product descriptions, pricing, inventory, storefront AI |
| 20 | Customer Support | customer-support | 🎧 | Help desk, ticket management, live chat bots |

**Thêm danh mục con cho các danh mục hiện tại và mới** (~40 sub-categories):

- **AI & Machine Learning**: AI Agents, LLM/Foundation Models, Computer Vision, NLP
- **Design & Creative**: Logo Generator, 3D Generator, Avatar Generator, UI/UX Design
- **Development**: Code Assistant, SQL Assistant, API Tools, Testing & QA
- **Marketing**: Email Marketing, Ad Copy, Campaign Management
- **Video & Media**: Video Generator, Video Editing, Text-to-Video, Live Streaming
- **Writing & Content**: Copywriting, Blog Writer, Paraphrasing, Prompt Generator, Storytelling
- **Image Generation**: Text-to-Image, Image Editing, Background Removal, Upscaling
- **Audio & Music**: Text-to-Speech, Music Generator, Transcription, Voice Cloning, Podcast Tools
- **Education & Research**: Tutoring, Research Assistant, Flashcards, Essay Writer
- **Automation**: Workflows, RPA, Scraping, Integration Tools
- **Productivity**: Presentations, Spreadsheets, Note-taking, Calendar/Scheduling, Translator

**Cập nhật CategoryGrid trên trang chủ** để hiển thị 20 danh mục (thay vì 10) với layout responsive.

### Thay đổi kỹ thuật
1. **SQL INSERT** via insert tool - thêm 10 danh mục gốc + ~40 danh mục con vào bảng `categories`
2. **`src/components/home/CategoryGrid.tsx`** - load categories từ DB thay vì hardcode, hiển thị responsive grid
3. **`src/pages/CategoriesPage.tsx`** - đã hoạt động đúng (đọc từ DB), không cần sửa

### Tệp thay đổi
- Insert data: ~50 rows vào bảng `categories`
- Edit: `src/components/home/CategoryGrid.tsx` (load từ DB, bỏ hardcode)

