-- =====================================================================
-- ToolScope — Seed demo data cho Tool Detail page (AI scores, reviews,
-- deals, comments, Q&A, screenshots, alternatives)
-- An toàn để chạy nhiều lần: dùng ON CONFLICT DO NOTHING / DELETE trước INSERT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. DEMO USERS (auth.users -> trigger tự tạo profiles + user_roles)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  demo_users jsonb := '[
    {"id":"d0000000-0000-0000-0000-000000000001","email":"minh.tran@demo.toolscope.com","name":"Minh Trần"},
    {"id":"d0000000-0000-0000-0000-000000000002","email":"lananh.pham@demo.toolscope.com","name":"Lan Anh Phạm"},
    {"id":"d0000000-0000-0000-0000-000000000003","email":"duc.nguyen@demo.toolscope.com","name":"Đức Nguyễn"},
    {"id":"d0000000-0000-0000-0000-000000000004","email":"hoang.le@demo.toolscope.com","name":"Hoàng Lê"},
    {"id":"d0000000-0000-0000-0000-000000000005","email":"thu.vo@demo.toolscope.com","name":"Thu Võ"}
  ]'::jsonb;
  u jsonb;
BEGIN
  FOR u IN SELECT * FROM jsonb_array_elements(demo_users)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = (u->>'id')::uuid) THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        (u->>'id')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        u->>'email', crypt('Demo@12345', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', u->>'name'),
        now(), now(), '', '', '', ''
      );
    END IF;
  END LOOP;
END $$;

-- Cập nhật avatar cho profile demo (trigger đã tạo display_name từ full_name)
UPDATE public.profiles SET avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id
WHERE id IN (
  'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005'
) AND avatar_url IS NULL;

-- ---------------------------------------------------------------------
-- 1. AI SCORES — cho toàn bộ 8 tools
-- ---------------------------------------------------------------------
DELETE FROM public.ai_scores WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000008'
);

INSERT INTO public.ai_scores (tool_id, overall_score, ease_of_use, features, value_for_money, support, performance, pros, cons, summary, is_recommended) VALUES
-- Jasper AI
('a0000000-0000-0000-0000-000000000001', 8.7, 8.5, 9.2, 7.8, 8.0, 9.0,
  ARRAY['Chất lượng nội dung tự nhiên, bám sát brand voice','Tích hợp SEO mode và Brand Voice mạnh','Kho template phong phú cho marketing team','Hỗ trợ đa ngôn ngữ tốt'],
  ARRAY['Giá khá cao so với đối thủ freemium','Cần thời gian làm quen với Brand Voice setup','Chatbot hỗ trợ đôi khi phản hồi chậm giờ cao điểm'],
  'Jasper AI là lựa chọn hàng đầu cho các marketing team cần viết nội dung với brand voice nhất quán ở quy mô lớn. Chất lượng đầu ra thuộc top thị trường, nhưng chi phí là điểm cần cân nhắc với team nhỏ hoặc freelancer.',
  true),
-- Copy.ai
('a0000000-0000-0000-0000-000000000002', 8.1, 8.8, 7.5, 8.6, 7.4, 8.2,
  ARRAY['Free plan khá rộng rãi để thử nghiệm','Workflow tự động hoá tốt cho quy trình content','Giao diện đơn giản, dễ dùng ngay cho người mới'],
  ARRAY['Chất lượng long-form chưa bằng Jasper','Một số template ít được cập nhật','Giới hạn từ ở gói free khá chặt'],
  'Copy.ai phù hợp cho freelancer và team nhỏ cần công cụ viết nhanh, chi phí hợp lý. Điểm mạnh là workflow automation, nhưng nếu cần content dài chuyên sâu thì Jasper vẫn nhích hơn.',
  true),
-- Writesonic
('a0000000-0000-0000-0000-000000000003', 7.6, 8.2, 7.8, 8.4, 6.8, 7.5,
  ARRAY['Tối ưu tốt cho content SEO, có tích hợp Surfer SEO','Chế độ Bulk generation tiết kiệm thời gian','Giá cạnh tranh ở gói freemium'],
  ARRAY['Chất lượng đôi lúc chưa ổn định ở bài dài','Hỗ trợ khách hàng phản hồi chậm','Giao diện còn một số lỗi nhỏ UI'],
  'Writesonic là lựa chọn kinh tế cho ai tập trung vào content SEO cần viết nhanh số lượng lớn. Không phải lựa chọn hàng đầu về chất lượng câu chữ nhưng bù lại giá tốt và tốc độ nhanh.',
  false),
-- Midjourney
('a0000000-0000-0000-0000-000000000004', 9.1, 7.0, 9.6, 8.5, 7.2, 9.4,
  ARRAY['Chất lượng hình ảnh nghệ thuật xuất sắc, dẫn đầu thị trường','Cộng đồng Discord lớn, nhiều tài nguyên học hỏi','Cập nhật model liên tục, luôn đi đầu xu hướng'],
  ARRAY['Chỉ dùng qua Discord/web, không có API chính thức dễ tích hợp','Không có gói free, phải trả phí ngay từ đầu','Đường cong học tập prompt engineering khá dốc với người mới'],
  'Midjourney vẫn là vua về chất lượng hình ảnh AI-generated, đặc biệt với phong cách nghệ thuật và concept art. Nếu cần tích hợp workflow doanh nghiệp qua API thì nên xem thêm các lựa chọn khác.',
  true),
-- GitHub Copilot
('a0000000-0000-0000-0000-000000000005', 8.9, 9.0, 8.8, 8.9, 8.5, 9.0,
  ARRAY['Tích hợp mượt vào VS Code, JetBrains và các IDE phổ biến','Gợi ý code chính xác, hiểu context tốt','Copilot Chat hỗ trợ debug và refactor hiệu quả','Free cho sinh viên và open-source maintainers'],
  ARRAY['Đôi khi gợi ý code không tối ưu về performance','Cần review kỹ code gợi ý để tránh lỗi bảo mật','Giá Business/Enterprise khá cao cho team lớn'],
  'GitHub Copilot là trợ lý coding AI toàn diện và trưởng thành nhất hiện nay, tích hợp sâu vào quy trình dev thực tế. Rất đáng đầu tư cho cả cá nhân và doanh nghiệp.',
  true),
-- Cursor
('a0000000-0000-0000-0000-000000000006', 9.0, 8.7, 9.3, 9.0, 8.0, 8.8,
  ARRAY['AI-first code editor, trải nghiệm liền mạch hơn plugin truyền thống','Composer/Agent mode mạnh cho refactor đa file','Hỗ trợ nhiều model AI (Claude, GPT) để lựa chọn','Free tier khá tốt để trải nghiệm đầy đủ tính năng'],
  ARRAY['Cần làm quen lại thao tác nếu đang dùng VS Code quen tay','Đôi khi tốn nhiều token/credit với dự án lớn','Cộng đồng plugin/extension chưa phong phú như VS Code'],
  'Cursor là một trong những AI code editor tiến bộ nhanh nhất, đặc biệt mạnh ở khả năng hiểu và sửa code trên nhiều file cùng lúc. Rất đáng thử cho dev muốn tối đa hoá năng suất với AI.',
  true),
-- Notion AI
('a0000000-0000-0000-0000-000000000007', 7.9, 8.9, 7.6, 7.5, 7.8, 8.0,
  ARRAY['Tích hợp mượt ngay trong workspace Notion sẵn có','Hữu ích cho tóm tắt, brainstorm, viết nhanh trong docs','Không cần chuyển đổi qua app khác, tiết kiệm thời gian'],
  ARRAY['Tính năng AI khá cơ bản so với công cụ chuyên biệt','Add-on phí riêng khá đắt nếu chỉ dùng AI','Giới hạn số lần dùng ở gói thường'],
  'Notion AI là add-on tiện lợi cho ai đã dùng Notion làm công cụ quản lý công việc chính, giúp tăng tốc viết và tóm tắt ngay trong workspace. Không thay thế được công cụ AI chuyên dụng nhưng rất tiện cho nhu cầu hàng ngày.',
  false),
-- Zapier
('a0000000-0000-0000-0000-000000000008', 8.5, 8.0, 9.0, 7.9, 8.2, 8.4,
  ARRAY['Kết nối hơn 6000+ apps, gần như mọi nhu cầu automation','Giao diện kéo-thả trực quan, không cần code','AI Actions mới giúp tự động hoá task phức tạp hơn'],
  ARRAY['Giá tăng nhanh khi số task/tháng lớn','Một số zap phức tạp cần logic điều kiện khó cấu hình','Đôi khi có delay vài phút với gói free'],
  'Zapier là công cụ automation không-code phổ biến nhất, phù hợp cho cá nhân đến doanh nghiệp muốn tự động hoá quy trình lặp lại giữa các app. Chi phí là yếu tố cần theo dõi khi scale lên.',
  true);

-- ---------------------------------------------------------------------
-- 2. REVIEWS — 2-3 review/tool, đa dạng người viết (bao gồm 1 editor review)
-- ---------------------------------------------------------------------
DELETE FROM public.reviews WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000008'
);

INSERT INTO public.reviews (tool_id, author_id, title, content, is_editor_review, status, upvotes, downvotes, ease_of_use, customer_support, value_for_money, likelihood_to_recommend, created_at) VALUES
-- Jasper AI
('a0000000-0000-0000-0000-000000000001', '5ce5d151-6cb5-4c5f-b25e-99abc8cfb08e',
  'Đánh giá chi tiết sau 3 tháng sử dụng cho team marketing 8 người',
  'Sau 3 tháng triển khai Jasper cho team content, điểm ấn tượng nhất là **Brand Voice** — sau khi train khoảng 10 bài mẫu, AI viết ra nội dung khá bám sát tone giọng thương hiệu, giảm được 60% thời gian edit lại so với công cụ khác. SEO mode tích hợp Surfer cũng giúp content lên top nhanh hơn.\n\nĐiểm trừ là giá Business khá cao nếu team dưới 5 người, và Brand Voice cần ít nhất 5-10 mẫu chất lượng để train hiệu quả — không phải setup 5 phút là dùng ngon ngay.\n\nTổng kết: đáng đầu tư nếu team publish content thường xuyên và cần giữ brand voice nhất quán.',
  true, 'published', 47, 2, 9, 8, 7, 9, now() - interval '18 days'),
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
  'Tốt cho blog nhưng hơi đắt cho freelancer',
  'Mình dùng Jasper để viết blog cho 2 client, chất lượng bài viết khá tốt, ít phải sửa. Nhưng với freelancer một mình thì gói Creator ($49/tháng) vẫn hơi cao so với ngân sách, đang cân nhắc chuyển sang Copy.ai để tiết kiệm.',
  false, 'published', 12, 1, 8, 7, 6, 7, now() - interval '9 days'),
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
  'Chatbot hỗ trợ chậm, nhưng sản phẩm ổn',
  'Có lần gặp lỗi thanh toán, chat với support chờ khá lâu (hơn 1 ngày mới có phản hồi qua email). Còn về chất lượng công cụ thì không có gì để phàn nàn, viết caption social và email marketing đều mượt.',
  false, 'published', 5, 0, 7, 5, 7, 7, now() - interval '3 days'),

-- Copy.ai
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
  'Free plan quá đủ để bắt đầu',
  'Mình mới làm content freelance, dùng free plan của Copy.ai gần 2 tháng vẫn chưa cần nâng cấp. Workflow tool giúp tạo hàng loạt caption Instagram nhanh gọn. Chất lượng câu chữ ổn cho social media, nhưng bài blog dài thì cần sửa nhiều hơn.',
  false, 'published', 23, 1, 9, 8, 9, 8, now() - interval '14 days'),
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004',
  'Workflow automation là điểm mạnh nhất',
  'So với Jasper thì Copy.ai không viết dài hay bằng, nhưng phần Workflows để tự động cả pipeline content (research → outline → draft) tiết kiệm thời gian đáng kể cho team nhỏ như mình.',
  false, 'published', 9, 0, 8, 7, 8, 8, now() - interval '6 days'),

-- Writesonic
('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000005',
  'Bulk generate tốt cho SEO agency',
  'Agency mình cần ra 50+ bài SEO mỗi tháng cho nhiều client, Writesonic Bulk mode giúp tiết kiệm rất nhiều thời gian. Chất lượng bài không xuất sắc nhưng đủ dùng làm base rồi editor chỉnh lại.',
  false, 'published', 15, 3, 7, 6, 8, 7, now() - interval '11 days'),
('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
  'UI còn vài lỗi nhỏ, support chậm',
  'Có lúc export bài bị lỗi format, phải báo support 2 ngày mới fix. Sản phẩm ổn về giá nhưng trải nghiệm UI chưa thật mượt so với đối thủ.',
  false, 'published', 4, 2, 6, 5, 7, 6, now() - interval '2 days'),

-- Midjourney
('a0000000-0000-0000-0000-000000000004', '5ce5d151-6cb5-4c5f-b25e-99abc8cfb08e',
  'Đánh giá chuyên sâu về chất lượng hình ảnh v6',
  'Midjourney v6 là bước tiến lớn về độ chi tiết và khả năng hiểu prompt phức tạp. So sách với DALL-E 3 và Stable Diffusion, Midjourney vẫn nhất về tính "nghệ thuật" và composition tổng thể của ảnh.\n\nHạn chế lớn nhất vẫn là phải dùng qua Discord (dù đã có web app riêng), và không có API chính thức để tích hợp vào ứng dụng của mình — đây là điểm mà designer làm production pipeline cần lưu ý.',
  true, 'published', 68, 4, 6, 7, 8, 9, now() - interval '20 days'),
('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
  'Đáng tiền cho concept artist',
  'Mình làm concept art cho game indie, Midjourney giúp rút ngắn thời gian mood board rất nhiều. Chi phí $30/tháng hợp lý so với giá trị mang lại.',
  false, 'published', 19, 0, 7, 6, 9, 9, now() - interval '7 days'),

-- GitHub Copilot
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003',
  'Không thể thiếu trong workflow hàng ngày',
  'Dùng Copilot 8 tháng nay cho dự án Next.js + TypeScript, tốc độ code nhanh hơn rõ rệt, đặc biệt với boilerplate và test case. Copilot Chat giải thích code cũ cũng rất hữu ích khi onboard thành viên mới.',
  false, 'published', 34, 1, 9, 9, 9, 10, now() - interval '16 days'),
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004',
  'Tốt nhưng cần review kỹ code gợi ý',
  'Copilot đôi khi gợi ý pattern cũ hoặc không tối ưu, nhất là với code liên quan security. Vẫn cần dev có kinh nghiệm review lại, không nên tin tưởng 100% AI.',
  false, 'published', 11, 2, 8, 8, 8, 8, now() - interval '4 days'),

-- Cursor
('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005',
  'Chuyển từ VS Code + Copilot sang Cursor, không hối hận',
  'Composer mode của Cursor cho phép sửa nhiều file cùng lúc theo yêu cầu tự nhiên, cảm giác như có một dev senior ngồi cạnh review + code cùng. Free tier đủ dùng để trải nghiệm trước khi quyết định trả phí Pro.',
  false, 'published', 41, 0, 8, 7, 9, 10, now() - interval '13 days'),
('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001',
  'Tốn credit nhanh với dự án lớn',
  'Dùng cho monorepo lớn, Agent mode hao credit khá nhanh nếu request phức tạp. Vẫn là công cụ tốt nhưng cần tính toán ngân sách nếu team nhiều người dùng chung.',
  false, 'published', 8, 1, 8, 6, 7, 8, now() - interval '5 days'),

-- Notion AI
('a0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000002',
  'Tiện lợi nhưng không thay được công cụ chuyên dụng',
  'Notion AI hữu ích để tóm tắt meeting notes và brainstorm nhanh ngay trong doc, nhưng nếu cần viết content chuyên sâu thì mình vẫn phải dùng thêm ChatGPT hoặc Jasper. Coi như một tiện ích add-on hơn là công cụ chính.',
  false, 'published', 14, 2, 9, 7, 6, 6, now() - interval '10 days'),

-- Zapier
('a0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000004',
  'Automation không-code tốt nhất mình từng dùng',
  'Kết nối Gmail, Slack, Google Sheets, Notion chỉ trong vài phút không cần biết code. AI Actions mới ra giúp xử lý logic phức tạp hơn zap truyền thống. Giá tăng nhanh khi task nhiều nhưng vẫn đáng.',
  false, 'published', 27, 1, 8, 8, 7, 9, now() - interval '8 days');

-- ---------------------------------------------------------------------
-- 3. DEALS — ưu đãi cho một số tool (mix loại discount)
-- ---------------------------------------------------------------------
DELETE FROM public.deals WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000008'
);

INSERT INTO public.deals (tool_id, title, description, coupon_code, discount_type, discount_value, deal_url, original_price, deal_price, currency, starts_at, expires_at, is_verified, is_exclusive, is_active, click_count, upvotes, downvotes) VALUES
('a0000000-0000-0000-0000-000000000001', 'Giảm 20% gói Business năm đầu', 'Áp dụng cho khách hàng mới đăng ký gói Business thanh toán theo năm.', 'TOOLSCOPE20', 'percentage', 20, 'https://www.jasper.ai?ref=toolscope&promo=TOOLSCOPE20', 69, 55, 'USD', now() - interval '5 days', now() + interval '25 days', true, true, true, 34, 12, 0),
('a0000000-0000-0000-0000-000000000002', 'Free trial mở rộng 14 ngày', 'Thay vì 7 ngày mặc định, dùng link này để nhận 14 ngày trial đầy đủ tính năng Pro.', NULL, 'free_trial', NULL, 'https://www.copy.ai?ref=toolscope&promo=extended-trial', NULL, NULL, 'USD', now() - interval '2 days', now() + interval '40 days', true, false, true, 51, 8, 1),
('a0000000-0000-0000-0000-000000000004', 'Giảm $10 gói Standard tháng đầu', 'Ưu đãi độc quyền cho người dùng ToolScope khi đăng ký mới.', 'TOOLSCOPE10', 'fixed', 10, 'https://www.midjourney.com?ref=toolscope&promo=TOOLSCOPE10', 30, 20, 'USD', now() - interval '10 days', now() + interval '5 days', true, true, true, 89, 22, 2),
('a0000000-0000-0000-0000-000000000005', 'Miễn phí cho sinh viên & giáo viên', 'GitHub Copilot miễn phí hoàn toàn cho sinh viên và giảng viên thông qua GitHub Student Pack.', 'STUDENTPACK', 'free_trial', NULL, 'https://github.com/features/copilot?ref=toolscope', NULL, 0, 'USD', now() - interval '30 days', now() + interval '90 days', true, false, true, 156, 45, 1),
('a0000000-0000-0000-0000-000000000006', 'Giảm 15% gói Pro năm', 'Thanh toán theo năm để tiết kiệm 15% so với thanh toán tháng.', 'CURSORYEAR15', 'percentage', 15, 'https://cursor.sh?ref=toolscope&promo=CURSORYEAR15', 240, 204, 'USD', now() - interval '3 days', now() + interval '20 days', true, false, true, 42, 9, 0),
('a0000000-0000-0000-0000-000000000008', 'Ưu đãi 30% năm đầu cho team mới', 'Áp dụng khi đăng ký gói Team hoặc Company, thanh toán theo năm.', 'ZAPTOOLSCOPE30', 'percentage', 30, 'https://zapier.com?ref=toolscope&promo=ZAPTOOLSCOPE30', 299, 209, 'USD', now() - interval '1 days', now() + interval '3 days', true, true, true, 67, 18, 1);

-- ---------------------------------------------------------------------
-- 4. COMMENTS — thảo luận trên trang tool (có reply lồng nhau)
-- ---------------------------------------------------------------------
DELETE FROM public.comments WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006'
);

-- Jasper AI thread
WITH c1 AS (
  INSERT INTO public.comments (tool_id, user_id, content, upvotes, downvotes, created_at)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'Có ai đang dùng Jasper cho content tiếng Việt không? Chất lượng thế nào so với tiếng Anh?', 6, 0, now() - interval '7 days')
  RETURNING id
)
INSERT INTO public.comments (tool_id, user_id, parent_id, content, upvotes, downvotes, created_at)
SELECT 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', c1.id,
  'Mình dùng cho tiếng Việt, chất lượng khá ổn nhưng đôi khi câu văn còn hơi "dịch máy", cần edit lại khoảng 20-30%.', 4, 0, now() - interval '6 days'
FROM c1;

INSERT INTO public.comments (tool_id, user_id, content, upvotes, downvotes, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'Ai biết cách train Brand Voice hiệu quả nhất không? Mình train mà kết quả chưa giống tone công ty lắm.', 3, 0, now() - interval '4 days');

-- Midjourney thread
WITH c2 AS (
  INSERT INTO public.comments (tool_id, user_id, content, upvotes, downvotes, created_at)
  VALUES ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
    'V6 so với V5 khác biệt nhiều không, có đáng để upgrade prompt lại từ đầu không?', 9, 1, now() - interval '9 days')
  RETURNING id
)
INSERT INTO public.comments (tool_id, user_id, parent_id, content, upvotes, downvotes, created_at)
SELECT 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', c2.id,
  'Khác biệt rõ nhất là độ chi tiết tay/mặt người và khả năng hiểu prompt dài phức tạp hơn nhiều. Đáng để thử lại prompt cũ.', 7, 0, now() - interval '8 days'
FROM c2;

-- GitHub Copilot thread
INSERT INTO public.comments (tool_id, user_id, content, upvotes, downvotes, created_at) VALUES
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'Copilot Business có khác biệt lớn gì so với Individual ngoài việc quản lý seat không?', 5, 0, now() - interval '5 days'),
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'Có thêm policy quản lý loại bỏ suggestion match code public, phù hợp cho công ty lo về bản quyền code.', 6, 0, now() - interval '4 days');

-- Cursor thread
INSERT INTO public.comments (tool_id, user_id, content, upvotes, downvotes, created_at) VALUES
('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 'Cursor có hỗ trợ tốt cho dự án Python/Django không hay chỉ mạnh JS/TS?', 4, 0, now() - interval '3 days');

-- ---------------------------------------------------------------------
-- 5. Q&A — questions + answers
-- ---------------------------------------------------------------------
DELETE FROM public.questions WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008'
);

-- Q1: Jasper AI — có accepted answer
WITH q1 AS (
  INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
    'Jasper có API để tích hợp vào hệ thống nội bộ không?',
    'Team mình muốn tích hợp Jasper vào CMS nội bộ để tự động generate draft bài viết. Không biết Jasper có cung cấp API công khai không và giá thế nào?',
    8, 0, 1, true, now() - interval '12 days')
  RETURNING id
)
INSERT INTO public.answers (question_id, user_id, content, upvotes, downvotes, is_accepted, created_at)
SELECT q1.id, '5ce5d151-6cb5-4c5f-b25e-99abc8cfb08e',
  'Có, Jasper cung cấp API riêng (Jasper API) dành cho gói Business trở lên, cho phép tích hợp generate content vào hệ thống nội bộ. Giá tính theo API calls, bạn cần liên hệ sales để lấy quote chi tiết vì không public sẵn trên trang giá.',
  11, 0, true, now() - interval '11 days'
FROM q1;

-- Q2: Copy.ai — chưa có answer
INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at) VALUES
('a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004',
  'Copy.ai free plan giới hạn bao nhiêu từ/tháng?',
  'Đang cân nhắc dùng free plan trước khi quyết định upgrade, không biết giới hạn từ chính xác là bao nhiêu và có reset hàng tháng không?',
  3, 0, 0, false, now() - interval '4 days');

-- Q3: Midjourney — 2 answers, 1 accepted
WITH q3 AS (
  INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at)
  VALUES ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
    'Ảnh tạo ra từ Midjourney có được dùng thương mại không?',
    'Mình muốn dùng ảnh Midjourney cho sản phẩm bán thương mại, có vấn đề bản quyền gì cần lưu ý không?',
    15, 1, 2, true, now() - interval '15 days')
  RETURNING id
)
INSERT INTO public.answers (question_id, user_id, content, upvotes, downvotes, is_accepted, created_at)
SELECT q3.id, u.user_id, u.content, u.upvotes, 0, u.is_accepted, u.created_at
FROM q3, (VALUES
  ('d0000000-0000-0000-0000-000000000003'::uuid,
   'Với gói trả phí (không phải free trial), bạn được quyền thương mại hoá ảnh tạo ra. Riêng doanh nghiệp trên $1M doanh thu/năm phải mua gói Pro/Mega để có đầy đủ quyền thương mại theo ToS mới nhất.',
   9, true, now() - interval '14 days'),
  ('5ce5d151-6cb5-4c5f-b25e-99abc8cfb08e'::uuid,
   'Bổ sung thêm: nên đọc kỹ Terms of Service vì Midjourney cập nhật chính sách khá thường xuyên, đặc biệt liên quan đến ảnh có yếu tố người thật hoặc thương hiệu bên thứ ba.',
   5, false, now() - interval '13 days')
) AS u(user_id, content, upvotes, is_accepted, created_at);

-- Q4: GitHub Copilot — chưa resolved
INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at) VALUES
('a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005',
  'Copilot có hỗ trợ offline không khi mất mạng?',
  'Team mình đôi khi làm việc ở khu vực mạng không ổn định, muốn biết Copilot có cache gợi ý để dùng tạm offline không hay bắt buộc phải online 100%?',
  2, 0, 0, false, now() - interval '2 days');

-- Q5: Cursor — có 1 answer
WITH q5 AS (
  INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at)
  VALUES ('a0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002',
    'Cursor có thể dùng model tự host (local LLM) không?',
    'Công ty mình có yêu cầu bảo mật cao, không được gửi code ra ngoài. Cursor có hỗ trợ kết nối model chạy local không?',
    6, 0, 1, true, now() - interval '6 days')
  RETURNING id
)
INSERT INTO public.answers (question_id, user_id, content, upvotes, downvotes, is_accepted, created_at)
SELECT q5.id, 'd0000000-0000-0000-0000-000000000004',
  'Hiện tại Cursor chưa hỗ trợ chính thức local LLM, chỉ cho chọn giữa các model cloud (GPT, Claude...). Nếu yêu cầu bảo mật cao tuyệt đối thì có thể cần xem xét self-hosted alternative khác như Continue.dev kết hợp Ollama.',
  8, 0, true, now() - interval '5 days'
FROM q5;

-- Q6: Zapier — chưa có answer
INSERT INTO public.questions (tool_id, user_id, title, content, upvotes, downvotes, answer_count, is_resolved, created_at) VALUES
('a0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003',
  'AI Actions của Zapier hoạt động thế nào, có ví dụ thực tế không?',
  'Thấy Zapier ra mắt AI Actions gần đây, không biết khác gì so với Zap thông thường và có case study thực tế nào không?',
  4, 0, 0, false, now() - interval '3 days');

-- ---------------------------------------------------------------------
-- 6. TOOL SCREENSHOTS — vài ảnh minh hoạ cho mỗi tool chính
-- ---------------------------------------------------------------------
DELETE FROM public.tool_screenshots WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

INSERT INTO public.tool_screenshots (tool_id, image_url, caption, sort_order) VALUES
('a0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80', 'Trình soạn thảo Jasper Docs với Brand Voice', 0),
('a0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', 'Bộ template marketing đa dạng của Jasper', 1),
('a0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80', 'Workflow automation trong Copy.ai', 0),
('a0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1547954575485-b46a1e024e2c?w=1200&q=80', 'Ảnh nghệ thuật tạo bởi Midjourney v6', 0),
('a0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80', 'Giao diện web app Midjourney', 1),
('a0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80', 'GitHub Copilot gợi ý code trong VS Code', 0),
('a0000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=1200&q=80', 'Cursor Composer mode chỉnh sửa đa file', 0);

-- ---------------------------------------------------------------------
-- 7. TOOL ALTERNATIVES — liên kết cross-category liên quan
-- ---------------------------------------------------------------------
DELETE FROM public.tool_alternatives WHERE tool_id IN (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

INSERT INTO public.tool_alternatives (tool_id, alternative_id, vote_count) VALUES
('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 18),  -- Jasper -> Copy.ai
('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 9),   -- Jasper -> Writesonic
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 14),  -- Copy.ai -> Jasper
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 11),  -- Copy.ai -> Writesonic
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 7),   -- Writesonic -> Jasper
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 10),  -- Writesonic -> Copy.ai
('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 25),  -- Copilot -> Cursor
('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 21);  -- Cursor -> Copilot

-- ---------------------------------------------------------------------
-- 8. Cập nhật vote_count trong tool_alternatives dựa trên votes thực tế nếu có (bỏ qua — dùng số cố định ở trên)
-- ---------------------------------------------------------------------

-- =====================================================================
-- XONG. Tổng kết dữ liệu vừa seed cho từng bảng.
-- =====================================================================
