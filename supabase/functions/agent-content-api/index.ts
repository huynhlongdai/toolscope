import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireEditorOrAgentToken, editorStatusOverride } from "../_shared/auth.ts";

// Unified content API for AI writing agents (Task 5, extended 2026-09-07 to
// cover tools/deals/translations in addition to blog posts).
//
// Lets an "editor" account - e.g. one handed to an outside AI content agent
// via the invite-editor flow, or an agent API token minted in Admin ->
// Agent Tokens - create, update, list content across FOUR resources
// through a single stable HTTP contract, instead of needing to know
// Supabase table names/RLS shapes directly:
//   - blog_posts  (bài viết - review/listicle/case_study/comparison/howto)
//   - tools       (công cụ AI trong thư mục)
//   - deals       (voucher / mã giảm giá / khuyến mãi gắn với 1 tool)
//   - translations (bản dịch đa ngôn ngữ cho blog/tool/deal/workflow)
//
// Mirrors the existing content-approval model already enforced by the
// 20260906040000_editor_content_workflow_permissions migration:
//   - editors can freely create/edit blog_posts/tools, but can NEVER set
//     status='published' themselves (enforced here in addition to RLS,
//     since this function uses requireEditor + the caller's own client,
//     not service-role, so RLS is the ultimate backstop either way).
//   - editors can freely create/edit deals, but can NEVER set
//     is_active=true themselves (deals has no `status` column - it uses
//     the `is_active` boolean instead).
//   - admins keep full control; publishing/activating itself still only
//     happens via the existing publish_content() RPC (or an admin calling
//     this same API with action=publish / action=activate_deal).
//   - every time an editor edits a blog_post/tool that was already
//     'published', the edit forces it back to 'pending_review'
//     (editorStatusOverride) so it comes off the public site until an
//     admin re-approves it. Deals follow the same idea via is_active=false.
//   - submitting for review notifies every admin via the existing
//     `notifications` table.
//   - translations have no publish-gate at all (they're always an
//     overlay next to whatever locale the visitor picks - no "unreviewed
//     content going live" risk), so editors/agents can freely
//     create/update/delete rows in that resource with no status logic.
//
// Actions (all via POST body.action), resource selected by body.resource
// (defaults to "blog_posts" for backward compatibility with the original
// Task 5 contract):
//
//   resource = "blog_posts" (default)
//     create/update/get/list/submit_for_review/publish/delete
//     -> { title, slug?, content, excerpt?, cover_image_url?, tags?,
//          seo_title?, seo_description?, seo_keywords?, related_tool_ids?,
//          submit_for_review? }
//
//   resource = "tools"
//     create/update/get/list/submit_for_review/publish/delete
//     -> { name, slug?, description?, short_description?, website_url?,
//          logo_url?, affiliate_url?, pricing_type?, category_id?,
//          platforms?, features?, pricing_details?, faq?, has_free_trial?,
//          trial_days?, requires_card?, signup_options?, related_tool_ids?,
//          submit_for_review? }
//
//   resource = "deals"
//     create/update/get/list/activate_deal/verify_deal/delete
//     -> { tool_id (bắt buộc khi create), title, description?, coupon_code?,
//          discount_type?, discount_value?, deal_url?, original_price?,
//          deal_price?, currency?, starts_at?, expires_at?, is_verified?,
//          is_exclusive?, slug? (tự sinh nếu bỏ trống, luôn kèm 8 ký tự
//          random để tránh trùng), deal_type? (coupon_code/lifetime_deal/
//          free_trial_extended/student_discount/referral/bundle/
//          flash_sale/no_code_auto - mặc định coupon_code), redemption_type?
//          (code/auto_apply/manual_contact - mặc định code), eligibility?
//          (jsonb, vd {"new_users_only":true}), terms_conditions?,
//          usage_limit?, banner_image_url? }
//     - get chấp nhận id HOẶC slug, trả kèm tools(name, slug, logo_url).
//     - list trả kèm slug/deal_type/redemption_type/savings_percent
//       (auto-tính từ original_price & deal_price)/usage_limit/
//       current_uses, và lọc thêm được theo deal_type.
//     - KHÔNG có action publish/submit_for_review riêng cho deals - dùng
//       action=activate_deal (admin only, tương đương publish) thay vì
//       publish_content() RPC vì deals dùng is_active không dùng status.
//     - action=verify_deal (KHÔNG cần quyền admin - ai cũng gọi được, kể
//       cả editor/agent) để báo "còn dùng được" (still_works=true, mặc
//       định) hoặc "báo lỗi/hết hạn" (still_works=false) - tín hiệu cộng
//       đồng, tách biệt với activate_deal (admin-only publish gate).
//
//   resource = "translations"
//     create (=upsert)/get/list/delete  — không có update/publish riêng,
//     "create" luôn upsert theo (entity_type, entity_id, locale, field_name)
//     -> { entity_type (blog|tool|deal|workflow), entity_id, locale,
//          fields: { field_name: text, ... } }  — 1 lần gọi ghi nhiều field
//        HOẶC { entity_type, entity_id, locale, field_name, translated_text }
//        — 1 field mỗi lần gọi, tuỳ agent thích dùng cách nào.
//
// ── Second wave (2026-09-11, "quản trị toàn vẹn website" mở rộng) ──────
// User đã xác nhận scope rõ ràng: mở rộng agent ra categories/tags/tasks/
// pages/menus/moderation(reports)/newsletter, NHƯNG users/settings/backup
// KHÔNG bao giờ cho agent chạm tới (giữ nguyên, không có action nào expose
// 3 resource đó qua API này). moderation (approve/reject content của
// NGƯỜI KHÁC, ban user) cũng KHÔNG expose - khác hẳn "tự duyệt draft của
// chính mình", nó động vào tài khoản người khác giống hệt lý do users bị
// loại. Agent chỉ được TẠO report (giống user thường bấm nút báo cáo).
//
//   resource = "categories" | "tags" | "tasks"
//     create/update/get/list/delete
//     -> { name, slug?, description?, icon?, parent_id? (categories only),
//          sort_order? }
//     - Cả 3 bảng này vốn không có khái niệm draft/pending_review (khác
//       blog/tools/deals) - admin đã chủ động cho phép editor
//       insert/update trực tiếp từ migration 20260906040000 (categories/
//       tags) - tasks được bổ sung tương tự trong migration hôm nay. Ghi
//       là LÊN NGAY công khai (giống categories hiện tại), không có
//       action publish/submit_for_review cho nhóm này.
//     - delete: CHỈ admin (editor/agent không được xoá taxonomy - tránh
//       xoá nhầm ảnh hưởng nhiều tools/tasks đang tham chiếu).
//
//   resource = "pages" (CMS page builder)
//     create/update/get/list/submit_for_review/publish/delete
//     -> { title, slug?, blocks? (jsonb block array), seo_title?,
//          seo_description?, template?, submit_for_review? }
//     - Y HỆT pattern blog_posts/tools: editor/agent chỉ tạo được
//       draft/pending_review, không bao giờ tự set published (RLS +
//       check trong code). action=publish chỉ admin, dùng chung RPC
//       publish_content(_table='pages',...).
//
//   resource = "menus" (header/footer navigation)
//     get/list/propose/publish
//     -> propose: { location ('header'|'footer'), items (array giống
//          MenuItem[] trong AdminMenus.tsx) } - LUÔN ghi vào cột
//          `draft_items`, KHÔNG BAO GIỜ ghi trực tiếp vào `items` (cột
//          live, hiển thị ngay cho mọi khách truy cập) cho dù caller là
//          editor hay admin gọi qua action này - menus không có khái
//          niệm status nên đây là cách duy nhất để có "staging" cho nav.
//     -> publish: { location } - CHỈ ADMIN - copy draft_items -> items
//          (RPC publish_menu, SECURITY DEFINER).
//     - get/list trả cả `items` (live) và `draft_items` (đang chờ) để
//       agent biết đề xuất của mình đã được áp dụng hay chưa.
//
//   resource = "reports" (tín hiệu kiểm duyệt - KHÔNG phải moderation
//   action thật, agent không bao giờ approve/reject/xoá nội dung người
//   khác hay ban user - những hành động đó vẫn 100% admin-only qua
//   AdminModeration.tsx, ngoài phạm vi API này)
//     create/get/list
//     -> create: { target_type (comment|review|tool|user|question),
//          target_id, reason, details? } - agent chỉ tạo report MỚI,
//          giống hệt 1 user thường bấm "Báo cáo". Không có action
//          update_status/resolve/dismiss ở đây (những cái đó là
//          admin-only, vẫn nằm trong AdminReports.tsx).
//     - list: chỉ trả report do CHÍNH caller tạo (reporter_id = user.id),
//       không xem được report của người khác (giữ nguyên RLS gốc).
//
//   resource = "newsletter" (soạn NỘI DUNG campaign, không phải subscriber
//   management - agent KHÔNG được đọc/viết newsletter_subscribers vì đó
//   là email PII của user thật, và không có quyền "gửi" bất cứ campaign
//   nào - gửi email vẫn là hành động admin-only, hiện tại còn là
//   placeholder chưa nối email provider thật trong AdminNewsletter.tsx)
//     draft_campaign/list_campaigns
//     -> draft_campaign: { subject, content } - lưu vào 1 row RIÊNG BIỆT
//          trong site_settings (key='newsletter_campaign_drafts'), KHÁC
//          với key='newsletter_campaigns' (lịch sử email admin đã thực sự
//          soạn) và hoàn toàn tách biệt khỏi mọi site config/blacklist
//          khác cũng nằm trong site_settings. Admin xem/duyệt/gửi thật
//          vẫn làm trong AdminNewsletter.tsx như cũ - action này chỉ để
//          agent "nộp bản thảo" nội dung, không đọc được subscriber nào.
//
// Auth: Bearer token of an editor or admin account. Accepts EITHER:
//   - a normal Supabase session JWT (human login, or generate-blog-post-
//     style service calls), OR
//   - an agent API token (`sk_agent_...`) minted in Admin -> Agent Tokens
//     (manage-agent-tokens function) - this is the intended way to give a
//     fully automated AI agent access without any email/password step.
// See requireEditorOrAgentToken in _shared/auth.ts for the resolution
// logic. This function adds no privilege beyond what the resolved
// editor/admin account already has through the SPA.

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return undefined;
}

function toNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const BLOG_POST_FIELDS = [
  "title", "slug", "content", "excerpt", "cover_image_url",
  "seo_title", "seo_description",
] as const;

const TOOL_FIELDS = [
  "name", "slug", "description", "short_description", "website_url",
  "logo_url", "affiliate_url", "pricing_type", "category_id",
] as const;

const DEAL_FIELDS = [
  "title", "description", "coupon_code", "discount_type", "deal_url", "currency",
  "deal_type", "redemption_type", "terms_conditions", "banner_image_url",
] as const;

const VALID_DEAL_TYPES = [
  "coupon_code", "lifetime_deal", "free_trial_extended", "student_discount",
  "referral", "bundle", "flash_sale", "no_code_auto",
] as const;

const VALID_REDEMPTION_TYPES = ["code", "auto_apply", "manual_contact"] as const;

const VALID_ENTITY_TYPES = ["blog", "tool", "deal", "workflow"] as const;

const CATEGORY_FIELDS = ["name", "slug", "description", "icon", "parent_id", "sort_order"] as const;
const TAG_FIELDS = ["name", "slug"] as const;
const TASK_FIELDS = ["name", "slug", "description", "icon", "sort_order"] as const;

const PAGE_FIELDS = ["title", "slug", "seo_title", "seo_description", "template"] as const;

const VALID_MENU_LOCATIONS = ["header", "footer"] as const;

const VALID_REPORT_TARGET_TYPES = ["comment", "review", "tool", "user", "question"] as const;

const NEWSLETTER_DRAFTS_KEY = "newsletter_campaign_drafts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireEditorOrAgentToken(req);
  if (auth instanceof Response) return auth;
  const { user, supabase, role } = auth;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Best-effort admin-notify helper: looks up every admin user_id and
  // inserts one row per admin. Never throws - a notify failure must not
  // block the actual content write from succeeding.
  async function notifyAdmins(opts: { title: string; message: string; link: string; metadata: Record<string, unknown> }) {
    try {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (!admins?.length) return;
      const rows = admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "system",
        title: opts.title,
        message: opts.message,
        link: opts.link,
        metadata: opts.metadata,
      }));
      await supabase.from("notifications").insert(rows);
    } catch (e) {
      console.error("notifyAdmins failed (non-fatal):", e);
    }
  }

  try {
    const body = await req.json();
    const action = body?.action as string;
    const resource = (body?.resource as string) || "blog_posts";

    // ────────────────────────────────────────────────────────────────
    // Resource: blog_posts (original Task 5 contract, unchanged)
    // ────────────────────────────────────────────────────────────────
    if (resource === "blog_posts") {
      if (action === "create") {
        if (!body.title || !body.content) return json({ error: "title và content là bắt buộc" }, 400);

        const slug = slugify(body.slug || body.title);
        const wantsReview = role === "editor" || body.submit_for_review === true;

        const payload: Record<string, unknown> = {
          title: body.title,
          slug,
          content: body.content,
          excerpt: body.excerpt ?? null,
          cover_image_url: body.cover_image_url ?? null,
          seo_title: body.seo_title ?? null,
          seo_description: body.seo_description ?? null,
          tags: toStringArray(body.tags) ?? [],
          seo_keywords: toStringArray(body.seo_keywords) ?? null,
          related_tool_ids: toStringArray(body.related_tool_ids) ?? null,
          author_id: user.id,
          status: wantsReview ? "pending_review" : "draft",
        };

        const { data, error } = await supabase.from("blog_posts").insert(payload).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) {
            return json({ error: `Slug "${slug}" đã tồn tại. Hãy đổi slug hoặc title.` }, 409);
          }
          return json({ error: error.message }, 500);
        }

        if (data.status === "pending_review") {
          await notifyAdmins({
            title: "Bài viết chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi bài "${data.title}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/blog?post=${data.id}`,
            metadata: { post_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, post: data });
      }

      if (action === "update") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);

        const { data: existing, error: fetchError } = await supabase
          .from("blog_posts")
          .select("id, status, author_id, title")
          .eq("id", body.id)
          .maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy bài viết" }, 404);
        if (role === "editor" && existing.author_id !== user.id) {
          return json({ error: "Chỉ có thể sửa bài viết do chính bạn tạo" }, 403);
        }

        const payload: Record<string, unknown> = {};
        for (const f of BLOG_POST_FIELDS) if (body[f] !== undefined) payload[f] = body[f];
        if (body.tags !== undefined) payload.tags = toStringArray(body.tags) ?? [];
        if (body.seo_keywords !== undefined) payload.seo_keywords = toStringArray(body.seo_keywords);
        if (body.related_tool_ids !== undefined) payload.related_tool_ids = toStringArray(body.related_tool_ids);
        if (body.slug !== undefined) payload.slug = slugify(body.slug);

        if (body.status !== undefined) {
          if (role === "editor" && body.status !== "draft" && body.status !== "pending_review") {
            return json({ error: "Editor chỉ có thể đặt status là draft hoặc pending_review. Dùng action=submit_for_review hoặc action=publish (admin)." }, 403);
          }
          payload.status = body.status;
        }

        const override = editorStatusOverride(role, existing.status);
        if (override) payload.status = override;

        const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", body.id).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) return json({ error: "Slug đã tồn tại" }, 409);
          return json({ error: error.message }, 500);
        }

        if (override === "pending_review" || (payload.status === "pending_review" && existing.status !== "pending_review")) {
          await notifyAdmins({
            title: "Bài viết chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi bài "${data.title}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/blog?post=${data.id}`,
            metadata: { post_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, post: data, ...(override ? { note: "Bài đã published bị chuyển về pending_review vì có chỉnh sửa mới, cần admin duyệt lại." } : {}) });
      }

      if (action === "submit_for_review") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("blog_posts").select("id, status, author_id, title").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy bài viết" }, 404);
        if (role === "editor" && existing.author_id !== user.id) return json({ error: "Chỉ có thể gửi duyệt bài do chính bạn tạo" }, 403);

        const { data, error } = await supabase.from("blog_posts").update({ status: "pending_review" }).eq("id", body.id).select().single();
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Bài viết chờ duyệt",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi bài "${data.title}" chờ admin duyệt trước khi đăng.`,
          link: `/admin/blog?post=${data.id}`,
          metadata: { post_id: data.id, source: "agent-content-api" },
        });
        return json({ success: true, post: data });
      }

      if (action === "publish") {
        if (role !== "admin") return json({ error: "Chỉ admin mới được publish. Dùng action=submit_for_review để gửi duyệt." }, 403);
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const publish = body.publish !== false;

        const { error } = await supabase.rpc("publish_content", { _table: "blog_posts", _id: body.id, _publish: publish });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("blog_posts").select().eq("id", body.id).maybeSingle();
        return json({ success: true, post: data });
      }

      if (action === "get") {
        if (!body.id && !body.slug) return json({ error: "Cần id hoặc slug" }, 400);
        let query = supabase.from("blog_posts").select("*");
        query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug);
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy bài viết" }, 404);
        return json({ post: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("blog_posts").select("id, title, slug, status, excerpt, cover_image_url, tags, created_at, updated_at, published_at, author_id", { count: "exact" });
        if (body.status) query = query.eq("status", body.status);
        if (body.author_id) query = query.eq("author_id", body.author_id);
        else if (role === "editor" && !body.all) query = query.eq("author_id", user.id);
        query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ posts: data, total: count, limit, offset });
      }

      if (action === "delete") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("blog_posts").select("id, status, author_id").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy bài viết" }, 404);
        if (role === "editor") {
          if (existing.author_id !== user.id) return json({ error: "Chỉ có thể xóa bài do chính bạn tạo" }, 403);
          if (existing.status === "published") return json({ error: "Không thể xóa bài đã published. Liên hệ admin." }, 403);
        }
        const { error } = await supabase.from("blog_posts").delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: "Invalid action for resource=blog_posts",
        valid_actions: ["create", "update", "get", "list", "submit_for_review", "publish", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: tools
    // ────────────────────────────────────────────────────────────────
    if (resource === "tools") {
      if (action === "create") {
        if (!body.name) return json({ error: "name là bắt buộc" }, 400);

        const slug = slugify(body.slug || body.name);
        const wantsReview = role === "editor" || body.submit_for_review === true;

        const payload: Record<string, unknown> = {
          name: body.name,
          slug,
          description: body.description ?? null,
          short_description: body.short_description ?? null,
          website_url: body.website_url ?? null,
          logo_url: body.logo_url ?? null,
          affiliate_url: body.affiliate_url ?? null,
          pricing_type: body.pricing_type ?? "free",
          category_id: body.category_id ?? null,
          platforms: toStringArray(body.platforms) ?? [],
          features: body.features ?? null,
          pricing_details: body.pricing_details ?? null,
          faq: Array.isArray(body.faq) && body.faq.length > 0 ? body.faq : null,
          has_free_trial: body.has_free_trial ?? false,
          trial_days: toNumberOrNull(body.trial_days) ?? null,
          requires_card: body.requires_card ?? null,
          signup_options: toStringArray(body.signup_options) ?? [],
          related_tool_ids: toStringArray(body.related_tool_ids) ?? null,
          submitted_by: user.id,
          // Consistent with resource=blog_posts: the agent API never
          // auto-publishes on create, regardless of caller role - it only
          // ever produces draft or pending_review. Going live always
          // requires an explicit action=publish call (admin) or the
          // publish_content() RPC / Admin UI, never an implicit side
          // effect of create. Editors can never insert status='published'
          // anyway (RLS blocks it too).
          status: wantsReview ? "pending_review" : "draft",
        };

        const { data, error } = await supabase.from("tools").insert(payload).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) {
            return json({ error: `Slug "${slug}" đã tồn tại. Hãy đổi slug hoặc name.` }, 409);
          }
          return json({ error: error.message }, 500);
        }

        if (data.status === "pending_review") {
          await notifyAdmins({
            title: "Tool chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi tool "${data.name}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/tools?tool=${data.id}`,
            metadata: { tool_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, tool: data });
      }

      if (action === "update") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);

        const { data: existing, error: fetchError } = await supabase
          .from("tools")
          .select("id, status, submitted_by, name")
          .eq("id", body.id)
          .maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy tool" }, 404);

        const payload: Record<string, unknown> = {};
        for (const f of TOOL_FIELDS) if (body[f] !== undefined) payload[f] = body[f];
        if (body.slug !== undefined) payload.slug = slugify(body.slug);
        if (body.platforms !== undefined) payload.platforms = toStringArray(body.platforms) ?? [];
        if (body.signup_options !== undefined) payload.signup_options = toStringArray(body.signup_options) ?? [];
        if (body.related_tool_ids !== undefined) payload.related_tool_ids = toStringArray(body.related_tool_ids);
        if (body.features !== undefined) payload.features = body.features;
        if (body.pricing_details !== undefined) payload.pricing_details = body.pricing_details;
        if (body.faq !== undefined) payload.faq = Array.isArray(body.faq) && body.faq.length > 0 ? body.faq : null;
        if (body.has_free_trial !== undefined) payload.has_free_trial = body.has_free_trial;
        if (body.trial_days !== undefined) payload.trial_days = toNumberOrNull(body.trial_days);
        if (body.requires_card !== undefined) payload.requires_card = body.requires_card;
        if (body.detailed_content !== undefined) payload.detailed_content = body.detailed_content;

        if (body.status !== undefined) {
          if (role === "editor" && body.status !== "draft" && body.status !== "pending_review") {
            return json({ error: "Editor chỉ có thể đặt status là draft hoặc pending_review. Dùng action=submit_for_review hoặc action=publish (admin)." }, 403);
          }
          payload.status = body.status;
        }

        const override = editorStatusOverride(role, existing.status);
        if (override) payload.status = override;

        const { data, error } = await supabase.from("tools").update(payload).eq("id", body.id).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) return json({ error: "Slug đã tồn tại" }, 409);
          return json({ error: error.message }, 500);
        }

        if (override === "pending_review" || (payload.status === "pending_review" && existing.status !== "pending_review")) {
          await notifyAdmins({
            title: "Tool chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi tool "${data.name}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/tools?tool=${data.id}`,
            metadata: { tool_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, tool: data, ...(override ? { note: "Tool đã published bị chuyển về pending_review vì có chỉnh sửa mới, cần admin duyệt lại." } : {}) });
      }

      if (action === "submit_for_review") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("tools").select("id, status, submitted_by, name").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy tool" }, 404);

        const { data, error } = await supabase.from("tools").update({ status: "pending_review" }).eq("id", body.id).select().single();
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Tool chờ duyệt",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi tool "${data.name}" chờ admin duyệt trước khi đăng.`,
          link: `/admin/tools?tool=${data.id}`,
          metadata: { tool_id: data.id, source: "agent-content-api" },
        });
        return json({ success: true, tool: data });
      }

      if (action === "publish") {
        if (role !== "admin") return json({ error: "Chỉ admin mới được publish. Dùng action=submit_for_review để gửi duyệt." }, 403);
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const publish = body.publish !== false;

        const { error } = await supabase.rpc("publish_content", { _table: "tools", _id: body.id, _publish: publish });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("tools").select().eq("id", body.id).maybeSingle();
        return json({ success: true, tool: data });
      }

      if (action === "get") {
        if (!body.id && !body.slug) return json({ error: "Cần id hoặc slug" }, 400);
        let query = supabase.from("tools").select("*, categories(name)");
        query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug);
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy tool" }, 404);
        return json({ tool: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("tools").select("id, name, slug, status, short_description, logo_url, pricing_type, category_id, created_at, updated_at, submitted_by", { count: "exact" });
        if (body.status) query = query.eq("status", body.status);
        if (body.category_id) query = query.eq("category_id", body.category_id);
        if (body.submitted_by) query = query.eq("submitted_by", body.submitted_by);
        else if (role === "editor" && !body.all) query = query.eq("submitted_by", user.id);
        query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ tools: data, total: count, limit, offset });
      }

      if (action === "delete") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("tools").select("id, status, submitted_by").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy tool" }, 404);
        if (role === "editor") {
          if (existing.submitted_by !== user.id) return json({ error: "Chỉ có thể xóa tool do chính bạn tạo" }, 403);
          if (existing.status === "published") return json({ error: "Không thể xóa tool đã published. Liên hệ admin." }, 403);
        }
        const { error } = await supabase.from("tools").delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: "Invalid action for resource=tools",
        valid_actions: ["create", "update", "get", "list", "submit_for_review", "publish", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: deals (voucher / mã giảm giá)
    // ────────────────────────────────────────────────────────────────
    if (resource === "deals") {
      if (action === "create") {
        if (!body.tool_id) return json({ error: "tool_id là bắt buộc" }, 400);
        if (!body.title) return json({ error: "title là bắt buộc" }, 400);
        if (body.deal_type !== undefined && !VALID_DEAL_TYPES.includes(body.deal_type)) {
          return json({ error: `deal_type phải là một trong: ${VALID_DEAL_TYPES.join(", ")}` }, 400);
        }
        if (body.redemption_type !== undefined && !VALID_REDEMPTION_TYPES.includes(body.redemption_type)) {
          return json({ error: `redemption_type phải là một trong: ${VALID_REDEMPTION_TYPES.join(", ")}` }, 400);
        }

        const slug = slugify(body.slug || body.title) + "-" + crypto.randomUUID().slice(0, 8);

        const payload: Record<string, unknown> = {
          tool_id: body.tool_id,
          title: body.title,
          slug,
          description: body.description ?? null,
          coupon_code: body.coupon_code ?? null,
          discount_type: body.discount_type ?? "percentage",
          discount_value: toNumberOrNull(body.discount_value),
          deal_url: body.deal_url ?? null,
          original_price: toNumberOrNull(body.original_price),
          deal_price: toNumberOrNull(body.deal_price),
          currency: body.currency ?? "USD",
          starts_at: body.starts_at ?? null,
          expires_at: body.expires_at ?? null,
          is_verified: body.is_verified ?? false,
          is_exclusive: body.is_exclusive ?? false,
          created_by: user.id,
          // Nhóm 1 (research bổ sung 2026-09-11): loại ưu đãi thực sự
          // (khác discount_type - discount_type chỉ mô tả CÁCH tính giảm
          // giá, deal_type mô tả LOẠI ưu đãi: coupon thường, lifetime deal
          // kiểu AppSumo, free trial kéo dài, sinh viên, referral, bundle,
          // flash sale, hoặc tự động không cần mã).
          deal_type: body.deal_type ?? "coupon_code",
          redemption_type: body.redemption_type ?? "code",
          eligibility: body.eligibility ?? {},
          terms_conditions: body.terms_conditions ?? null,
          usage_limit: toNumberOrNull(body.usage_limit),
          banner_image_url: body.banner_image_url ?? null,
          // Editors (incl. AI agent) can NEVER insert is_active=true - the
          // DB RLS ("Editors can insert inactive deals") would reject it
          // anyway, but this gives a friendlier 200-with-inactive instead
          // of a raw RLS rejection. Admin may activate immediately.
          is_active: role === "admin" ? (body.is_active ?? true) : false,
        };

        const { data, error } = await supabase.from("deals").insert(payload).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) {
            return json({ error: "Slug đã tồn tại, thử lại (slug tự sinh kèm mã ngẫu nhiên nên hiếm khi trùng)" }, 409);
          }
          return json({ error: error.message }, 500);
        }

        if (!data.is_active) {
          await notifyAdmins({
            title: "Deal chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã tạo deal "${data.title}" (chưa kích hoạt) chờ admin duyệt.`,
            link: `/admin/deals?deal=${data.id}`,
            metadata: { deal_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, deal: data });
      }

      if (action === "update") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        if (body.deal_type !== undefined && !VALID_DEAL_TYPES.includes(body.deal_type)) {
          return json({ error: `deal_type phải là một trong: ${VALID_DEAL_TYPES.join(", ")}` }, 400);
        }
        if (body.redemption_type !== undefined && !VALID_REDEMPTION_TYPES.includes(body.redemption_type)) {
          return json({ error: `redemption_type phải là một trong: ${VALID_REDEMPTION_TYPES.join(", ")}` }, 400);
        }

        const { data: existing, error: fetchError } = await supabase
          .from("deals").select("id, is_active, created_by, title").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy deal" }, 404);

        const payload: Record<string, unknown> = {};
        for (const f of DEAL_FIELDS) if (body[f] !== undefined) payload[f] = body[f];
        if (body.tool_id !== undefined) payload.tool_id = body.tool_id;
        if (body.discount_value !== undefined) payload.discount_value = toNumberOrNull(body.discount_value);
        if (body.original_price !== undefined) payload.original_price = toNumberOrNull(body.original_price);
        if (body.deal_price !== undefined) payload.deal_price = toNumberOrNull(body.deal_price);
        if (body.starts_at !== undefined) payload.starts_at = body.starts_at;
        if (body.expires_at !== undefined) payload.expires_at = body.expires_at;
        if (body.is_verified !== undefined) payload.is_verified = body.is_verified;
        if (body.is_exclusive !== undefined) payload.is_exclusive = body.is_exclusive;
        if (body.eligibility !== undefined) payload.eligibility = body.eligibility;
        if (body.usage_limit !== undefined) payload.usage_limit = toNumberOrNull(body.usage_limit);

        // Editors' RLS requires is_active stays false on every UPDATE too
        // ("Editors can update deals keeping them inactive") - force it
        // here for a friendly error message instead of a raw RLS 403, and
        // un-activate any deal an editor touches so admin re-reviews it.
        if (role === "editor") {
          if (body.is_active === true) {
            return json({ error: "Editor không thể tự kích hoạt deal. Dùng action=activate_deal (admin) hoặc chờ admin duyệt." }, 403);
          }
          if (existing.is_active) payload.is_active = false;
        } else if (body.is_active !== undefined) {
          payload.is_active = body.is_active;
        }

        const { data, error } = await supabase.from("deals").update(payload).eq("id", body.id).select().single();
        if (error) return json({ error: error.message }, 500);

        if (role === "editor" && existing.is_active && !data.is_active) {
          await notifyAdmins({
            title: "Deal chờ duyệt lại",
            message: `Editor/AI Agent đã sửa deal "${data.title}" đang active - deal đã tự tắt (is_active=false), cần admin duyệt lại.`,
            link: `/admin/deals?deal=${data.id}`,
            metadata: { deal_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, deal: data });
      }

      if (action === "activate_deal") {
        if (role !== "admin") return json({ error: "Chỉ admin mới được kích hoạt deal. Deal editor tạo sẽ chờ admin duyệt." }, 403);
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const activate = body.activate !== false;

        const { error } = await supabase.rpc("publish_content", { _table: "deals", _id: body.id, _publish: activate });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("deals").select().eq("id", body.id).maybeSingle();
        return json({ success: true, deal: data });
      }

      // verify_deal - báo "còn dùng được" (still_works=true, mặc định) hoặc
      // "báo lỗi/hết hạn" (still_works=false). Bất kỳ editor/admin/agent
      // đều gọi được (giống người dùng thường click nút xác nhận trên UI) -
      // KHÔNG cần quyền admin vì đây chỉ là 1 tín hiệu cộng đồng, không phải
      // hành động publish. Dùng RPC verify_deal (SECURITY DEFINER) để giữ
      // logic tập trung 1 nơi, giống publish_content.
      if (action === "verify_deal") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const stillWorks = body.still_works !== false;

        const { error } = await supabase.rpc("verify_deal", { _deal_id: body.id, _still_works: stillWorks });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("deals").select().eq("id", body.id).maybeSingle();
        return json({ success: true, deal: data });
      }

      if (action === "get") {
        if (!body.id && !body.slug) return json({ error: "Cần id hoặc slug" }, 400);
        let query = supabase.from("deals").select("*, tools(name, slug, logo_url)");
        query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug);
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy deal" }, 404);
        return json({ deal: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("deals").select("id, tool_id, title, slug, coupon_code, deal_type, redemption_type, discount_type, discount_value, savings_percent, usage_limit, current_uses, is_active, is_verified, is_exclusive, expires_at, created_at, created_by", { count: "exact" });
        if (body.is_active !== undefined) query = query.eq("is_active", body.is_active);
        if (body.tool_id) query = query.eq("tool_id", body.tool_id);
        if (body.deal_type) query = query.eq("deal_type", body.deal_type);
        if (body.created_by) query = query.eq("created_by", body.created_by);
        else if (role === "editor" && !body.all) query = query.eq("created_by", user.id);
        query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ deals: data, total: count, limit, offset });
      }

      if (action === "delete") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("deals").select("id, is_active, created_by").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy deal" }, 404);
        if (role === "editor") {
          if (existing.created_by !== user.id) return json({ error: "Chỉ có thể xóa deal do chính bạn tạo" }, 403);
          if (existing.is_active) return json({ error: "Không thể xóa deal đang active. Liên hệ admin." }, 403);
        }
        const { error } = await supabase.from("deals").delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: "Invalid action for resource=deals",
        valid_actions: ["create", "update", "get", "list", "activate_deal", "verify_deal", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: translations (bản dịch đa ngôn ngữ)
    // ────────────────────────────────────────────────────────────────
    if (resource === "translations") {
      if (action === "create") {
        const entityType = body.entity_type as string;
        const entityId = body.entity_id as string;
        const locale = body.locale as string;

        if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as any)) {
          return json({ error: `entity_type phải là một trong: ${VALID_ENTITY_TYPES.join(", ")}` }, 400);
        }
        if (!entityId) return json({ error: "entity_id là bắt buộc" }, 400);
        if (!locale) return json({ error: "locale là bắt buộc (vd: en, ja, ko, zh...)" }, 400);

        // Two calling shapes: a single field_name/translated_text pair, or
        // a batch { fields: { field_name: text, ... } } for writing many
        // fields of one entity/locale in a single request.
        const fieldsInput: Record<string, string> =
          body.fields && typeof body.fields === "object"
            ? body.fields
            : body.field_name
            ? { [body.field_name]: body.translated_text }
            : {};

        const entries = Object.entries(fieldsInput).filter(([, v]) => v !== undefined && v !== null && v !== "");
        if (entries.length === 0) {
          return json({ error: "Cần fields:{...} hoặc field_name+translated_text" }, 400);
        }

        const upserts = entries.map(([field_name, translated_text]) => ({
          entity_type: entityType,
          entity_id: entityId,
          locale,
          field_name,
          translated_text: String(translated_text),
          is_auto: body.is_auto ?? true,
        }));

        const { data, error } = await supabase
          .from("translations")
          .upsert(upserts, { onConflict: "entity_type,entity_id,locale,field_name" })
          .select();
        if (error) return json({ error: error.message }, 500);

        return json({ success: true, saved: data?.length ?? 0, translations: data });
      }

      if (action === "get") {
        const entityType = body.entity_type as string;
        const entityId = body.entity_id as string;
        if (!entityType || !entityId) return json({ error: "Cần entity_type và entity_id" }, 400);

        let query = supabase.from("translations").select("*").eq("entity_type", entityType).eq("entity_id", entityId);
        if (body.locale) query = query.eq("locale", body.locale);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ translations: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("translations").select("*", { count: "exact" });
        if (body.entity_type) query = query.eq("entity_type", body.entity_type);
        if (body.entity_id) query = query.eq("entity_id", body.entity_id);
        if (body.locale) query = query.eq("locale", body.locale);
        query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ translations: data, total: count, limit, offset });
      }

      if (action === "delete") {
        const entityType = body.entity_type as string;
        const entityId = body.entity_id as string;
        if (!entityType || !entityId) return json({ error: "Cần entity_type và entity_id" }, 400);

        let query = supabase.from("translations").delete().eq("entity_type", entityType).eq("entity_id", entityId);
        if (body.locale) query = query.eq("locale", body.locale);
        if (body.field_name) query = query.eq("field_name", body.field_name);
        const { error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: "Invalid action for resource=translations",
        valid_actions: ["create", "get", "list", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: categories / tags / tasks (simple taxonomy - shared
    // handler since all 3 have the exact same shape: name/slug/etc.,
    // no draft/published concept, admin-only delete).
    // ────────────────────────────────────────────────────────────────
    if (resource === "categories" || resource === "tags" || resource === "tasks") {
      const table = resource;
      const FIELDS = resource === "categories" ? CATEGORY_FIELDS : resource === "tags" ? TAG_FIELDS : TASK_FIELDS;

      if (action === "create") {
        if (!body.name) return json({ error: "name là bắt buộc" }, 400);
        const slug = slugify(body.slug || body.name);

        const payload: Record<string, unknown> = { name: body.name, slug };
        for (const f of FIELDS) if (f !== "name" && f !== "slug" && body[f] !== undefined) payload[f] = body[f];

        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if (error) {
          if (/duplicate key/i.test(error.message)) return json({ error: `"${body.name}" hoặc slug "${slug}" đã tồn tại` }, 409);
          return json({ error: error.message }, 500);
        }
        return json({ success: true, [table === "categories" ? "category" : table === "tags" ? "tag" : "task"]: data });
      }

      if (action === "update") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const payload: Record<string, unknown> = {};
        for (const f of FIELDS) if (body[f] !== undefined) payload[f] = body[f];
        if (body.slug !== undefined) payload.slug = slugify(body.slug);

        const { data, error } = await supabase.from(table).update(payload).eq("id", body.id).select().single();
        if (error) {
          if (/duplicate key/i.test(error.message)) return json({ error: "Tên hoặc slug đã tồn tại" }, 409);
          return json({ error: error.message }, 500);
        }
        if (!data) return json({ error: "Không tìm thấy" }, 404);
        return json({ success: true, [table === "categories" ? "category" : table === "tags" ? "tag" : "task"]: data });
      }

      if (action === "get") {
        if (!body.id && !body.slug) return json({ error: "Cần id hoặc slug" }, 400);
        let query = supabase.from(table).select("*");
        query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug);
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy" }, 404);
        return json({ [table === "categories" ? "category" : table === "tags" ? "tag" : "task"]: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from(table).select("*", { count: "exact" });
        if (body.parent_id !== undefined && table === "categories") query = query.eq("parent_id", body.parent_id);
        query = query.order("sort_order", { ascending: true, nullsFirst: false }).range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ [table]: data, total: count, limit, offset });
      }

      if (action === "delete") {
        // Editor/agent KHÔNG được xoá taxonomy - có thể đang được nhiều
        // tools/tasks khác tham chiếu, xoá nhầm ảnh hưởng diện rộng.
        // Chỉ admin (RLS "Admins can manage X" ALL policy) mới xoá được.
        if (role !== "admin") return json({ error: `Chỉ admin mới được xoá ${resource}. Editor/AI agent chỉ có thể tạo/sửa.` }, 403);
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { error } = await supabase.from(table).delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: `Invalid action for resource=${resource}`,
        valid_actions: ["create", "update", "get", "list", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: pages (CMS page builder) - same editor-safe pattern as
    // tools/blog_posts: editor/agent can only produce draft/pending_review,
    // action=publish is admin-only via publish_content() RPC.
    // ────────────────────────────────────────────────────────────────
    if (resource === "pages") {
      if (action === "create") {
        if (!body.title) return json({ error: "title là bắt buộc" }, 400);
        const slug = slugify(body.slug || body.title);
        const wantsReview = role === "editor" || body.submit_for_review === true;

        const payload: Record<string, unknown> = {
          title: body.title,
          slug,
          blocks: Array.isArray(body.blocks) ? body.blocks : [],
          seo_title: body.seo_title ?? null,
          seo_description: body.seo_description ?? null,
          template: body.template ?? "blank",
          created_by: user.id,
          status: wantsReview ? "pending_review" : "draft",
        };

        const { data, error } = await supabase.from("pages").insert(payload).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) return json({ error: `Slug "${slug}" đã tồn tại. Hãy đổi slug hoặc title.` }, 409);
          return json({ error: error.message }, 500);
        }

        if (data.status === "pending_review") {
          await notifyAdmins({
            title: "Trang chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã tạo trang "${data.title}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/pages/${data.id}`,
            metadata: { page_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, page: data });
      }

      if (action === "update") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("pages").select("id, status, created_by, title").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy trang" }, 404);
        if (role === "editor" && existing.created_by && existing.created_by !== user.id) {
          return json({ error: "Chỉ có thể sửa trang do chính bạn tạo" }, 403);
        }

        const payload: Record<string, unknown> = {};
        for (const f of PAGE_FIELDS) if (body[f] !== undefined) payload[f] = body[f];
        if (body.slug !== undefined) payload.slug = slugify(body.slug);
        if (body.blocks !== undefined) payload.blocks = Array.isArray(body.blocks) ? body.blocks : [];

        if (body.status !== undefined) {
          if (role === "editor" && body.status !== "draft" && body.status !== "pending_review") {
            return json({ error: "Editor chỉ có thể đặt status là draft hoặc pending_review. Dùng action=submit_for_review hoặc action=publish (admin)." }, 403);
          }
          payload.status = body.status;
        }

        const override = editorStatusOverride(role, existing.status);
        if (override) payload.status = override;

        const { data, error } = await supabase.from("pages").update(payload).eq("id", body.id).select().single();
        if (error) {
          if (/duplicate key.*slug/i.test(error.message)) return json({ error: "Slug đã tồn tại" }, 409);
          return json({ error: error.message }, 500);
        }

        if (override === "pending_review" || (payload.status === "pending_review" && existing.status !== "pending_review")) {
          await notifyAdmins({
            title: "Trang chờ duyệt",
            message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã sửa trang "${data.title}" chờ admin duyệt trước khi đăng.`,
            link: `/admin/pages/${data.id}`,
            metadata: { page_id: data.id, source: "agent-content-api" },
          });
        }

        return json({ success: true, page: data, ...(override ? { note: "Trang đã published bị chuyển về pending_review vì có chỉnh sửa mới, cần admin duyệt lại." } : {}) });
      }

      if (action === "submit_for_review") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("pages").select("id, status, created_by, title").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy trang" }, 404);
        if (role === "editor" && existing.created_by && existing.created_by !== user.id) return json({ error: "Chỉ có thể gửi duyệt trang do chính bạn tạo" }, 403);

        const { data, error } = await supabase.from("pages").update({ status: "pending_review" }).eq("id", body.id).select().single();
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Trang chờ duyệt",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi trang "${data.title}" chờ admin duyệt trước khi đăng.`,
          link: `/admin/pages/${data.id}`,
          metadata: { page_id: data.id, source: "agent-content-api" },
        });
        return json({ success: true, page: data });
      }

      if (action === "publish") {
        if (role !== "admin") return json({ error: "Chỉ admin mới được publish. Dùng action=submit_for_review để gửi duyệt." }, 403);
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const publish = body.publish !== false;

        const { error } = await supabase.rpc("publish_content", { _table: "pages", _id: body.id, _publish: publish });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("pages").select().eq("id", body.id).maybeSingle();
        return json({ success: true, page: data });
      }

      if (action === "get") {
        if (!body.id && !body.slug) return json({ error: "Cần id hoặc slug" }, 400);
        let query = supabase.from("pages").select("*");
        query = body.id ? query.eq("id", body.id) : query.eq("slug", body.slug);
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy trang" }, 404);
        return json({ page: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("pages").select("id, title, slug, status, template, created_by, created_at, updated_at", { count: "exact" });
        if (body.status) query = query.eq("status", body.status);
        if (body.created_by) query = query.eq("created_by", body.created_by);
        else if (role === "editor" && !body.all) query = query.eq("created_by", user.id);
        query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ pages: data, total: count, limit, offset });
      }

      if (action === "delete") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        const { data: existing, error: fetchError } = await supabase
          .from("pages").select("id, status, created_by").eq("id", body.id).maybeSingle();
        if (fetchError) return json({ error: fetchError.message }, 500);
        if (!existing) return json({ error: "Không tìm thấy trang" }, 404);
        if (role === "editor") {
          if (existing.created_by !== user.id) return json({ error: "Chỉ có thể xóa trang do chính bạn tạo" }, 403);
          if (existing.status === "published") return json({ error: "Không thể xóa trang đã published. Liên hệ admin." }, 403);
        }
        const { error } = await supabase.from("pages").delete().eq("id", body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      return json({
        error: "Invalid action for resource=pages",
        valid_actions: ["create", "update", "get", "list", "submit_for_review", "publish", "delete"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: menus - propose/publish only. Editor/agent writes ALWAYS
    // go to draft_items, NEVER to the live `items` column, regardless of
    // caller role. Only action=publish (admin-only, via publish_menu RPC)
    // copies draft_items -> items.
    // ────────────────────────────────────────────────────────────────
    if (resource === "menus") {
      if (action === "propose") {
        const location = body.location as string;
        if (!location || !VALID_MENU_LOCATIONS.includes(location as any)) {
          return json({ error: `location phải là một trong: ${VALID_MENU_LOCATIONS.join(", ")}` }, 400);
        }
        if (!Array.isArray(body.items)) return json({ error: "items phải là 1 array MenuItem[]" }, 400);

        const { data: existing } = await supabase.from("menus").select("id").eq("location", location).maybeSingle();

        let data, error;
        if (existing) {
          ({ data, error } = await supabase
            .from("menus")
            .update({ draft_items: body.items, draft_updated_by: user.id, draft_updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select()
            .single());
        } else {
          // Chưa có row nào cho location này - tạo mới với items=[] (live
          // rỗng) và draft_items=đề xuất, để admin publish khi sẵn sàng.
          ({ data, error } = await supabase
            .from("menus")
            .insert({ name: location, location, items: [], draft_items: body.items, draft_updated_by: user.id, draft_updated_at: new Date().toISOString() })
            .select()
            .single());
        }
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Đề xuất menu mới chờ duyệt",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã đề xuất menu "${location}" mới - cần admin publish để áp dụng.`,
          link: `/admin/menus`,
          metadata: { location, source: "agent-content-api" },
        });

        return json({ success: true, menu: data, note: "Đã lưu vào draft_items. Menu LIVE chưa thay đổi - cần admin gọi action=publish để áp dụng." });
      }

      if (action === "publish") {
        if (role !== "admin") return json({ error: "Chỉ admin mới được publish menu." }, 403);
        const location = body.location as string;
        if (!location || !VALID_MENU_LOCATIONS.includes(location as any)) {
          return json({ error: `location phải là một trong: ${VALID_MENU_LOCATIONS.join(", ")}` }, 400);
        }

        const { error } = await supabase.rpc("publish_menu", { _location: location });
        if (error) return json({ error: error.message }, 500);

        const { data } = await supabase.from("menus").select().eq("location", location).maybeSingle();
        return json({ success: true, menu: data });
      }

      if (action === "get" || action === "list") {
        let query = supabase.from("menus").select("*");
        if (body.location) query = query.eq("location", body.location);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        if (action === "get") {
          if (!data?.length) return json({ error: "Không tìm thấy menu" }, 404);
          return json({ menu: data[0] });
        }
        return json({ menus: data });
      }

      return json({
        error: "Invalid action for resource=menus",
        valid_actions: ["propose", "publish", "get", "list"],
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: reports (moderation SIGNAL only - agent creates reports
    // exactly like a normal user clicking "Report", never approves/
    // rejects/deletes anything or bans a user - those stay admin-only in
    // AdminModeration.tsx / AdminReports.tsx, outside this API entirely).
    // ────────────────────────────────────────────────────────────────
    if (resource === "reports") {
      if (action === "create") {
        const targetType = body.target_type as string;
        if (!targetType || !VALID_REPORT_TARGET_TYPES.includes(targetType as any)) {
          return json({ error: `target_type phải là một trong: ${VALID_REPORT_TARGET_TYPES.join(", ")}` }, 400);
        }
        if (!body.target_id) return json({ error: "target_id là bắt buộc" }, 400);
        if (!body.reason) return json({ error: "reason là bắt buộc" }, 400);

        const payload = {
          reporter_id: user.id,
          target_type: targetType,
          target_id: body.target_id,
          reason: body.reason,
          details: body.details ?? null,
          status: "pending",
        };

        const { data, error } = await supabase.from("reports").insert(payload).select().single();
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Báo cáo mới",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã gửi báo cáo về ${targetType}: ${body.reason}`,
          link: `/admin/reports`,
          metadata: { report_id: data.id, target_type: targetType, target_id: body.target_id, source: "agent-content-api" },
        });

        return json({ success: true, report: data });
      }

      if (action === "get") {
        if (!body.id) return json({ error: "id là bắt buộc" }, 400);
        // RLS "Users can view own reports" tự giới hạn - editor/agent chỉ
        // thấy report do chính user_id gắn với token tạo ra, admin thấy hết.
        const { data, error } = await supabase.from("reports").select("*").eq("id", body.id).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy hoặc không có quyền xem" }, 404);
        return json({ report: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("reports").select("*", { count: "exact" });
        // Editor/agent chỉ được xem report do chính mình tạo (không phải
        // RLS chặn ở đây vì dùng service-role client - enforce ở code,
        // giống mọi resource khác trong function này).
        if (role !== "admin") query = query.eq("reporter_id", user.id);
        else if (body.reporter_id) query = query.eq("reporter_id", body.reporter_id);
        if (body.status) query = query.eq("status", body.status);
        if (body.target_type) query = query.eq("target_type", body.target_type);
        query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ reports: data, total: count, limit, offset });
      }

      return json({
        error: "Invalid action for resource=reports",
        valid_actions: ["create", "get", "list"],
        note: "Approve/reject/resolve/dismiss/ban là admin-only, ngoài phạm vi agent API này. Dùng AdminReports.tsx/AdminModeration.tsx.",
      }, 400);
    }

    // ────────────────────────────────────────────────────────────────
    // Resource: newsletter - CAMPAIGN CONTENT DRAFTING ONLY. No access to
    // newsletter_subscribers (PII), no send capability. Drafts are stored
    // in their OWN site_settings key, never touching site config/
    // blacklist/anything else that lives in that table.
    // ────────────────────────────────────────────────────────────────
    if (resource === "newsletter") {
      if (action === "draft_campaign") {
        if (!body.subject) return json({ error: "subject là bắt buộc" }, 400);
        if (!body.content) return json({ error: "content là bắt buộc" }, 400);

        const { data: existingRow } = await supabase
          .from("site_settings").select("value").eq("key", NEWSLETTER_DRAFTS_KEY).maybeSingle();
        const drafts: any[] = Array.isArray(existingRow?.value) ? (existingRow!.value as any[]) : [];

        const draft = {
          id: crypto.randomUUID(),
          subject: body.subject,
          content: body.content,
          created_by: user.id,
          created_by_role: role,
          created_at: new Date().toISOString(),
          status: "draft", // luôn "draft" - agent không có action để đổi status này, admin duyệt/gửi trong AdminNewsletter.tsx
        };
        const updated = [draft, ...drafts].slice(0, 50);

        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: NEWSLETTER_DRAFTS_KEY, value: updated as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) return json({ error: error.message }, 500);

        await notifyAdmins({
          title: "Bản thảo newsletter mới",
          message: `${role === "editor" ? "Editor/AI Agent" : "Admin"} đã soạn bản thảo email "${body.subject}" - vào Admin -> Newsletter để xem/gửi.`,
          link: `/admin/newsletter`,
          metadata: { draft_id: draft.id, source: "agent-content-api" },
        });

        return json({ success: true, draft, note: "Bản thảo đã lưu, cần admin vào AdminNewsletter.tsx để xem/gửi thật - agent không có quyền gửi hoặc xem subscriber." });
      }

      if (action === "list_campaigns") {
        const { data: row, error } = await supabase
          .from("site_settings").select("value").eq("key", NEWSLETTER_DRAFTS_KEY).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        const drafts: any[] = Array.isArray(row?.value) ? (row!.value as any[]) : [];
        // Editor/agent chỉ thấy draft do chính mình tạo, admin thấy hết.
        const visible = role === "admin" ? drafts : drafts.filter((d) => d.created_by === user.id);
        return json({ drafts: visible, total: visible.length });
      }

      return json({
        error: "Invalid action for resource=newsletter",
        valid_actions: ["draft_campaign", "list_campaigns"],
        note: "Không có quyền đọc newsletter_subscribers hoặc gửi email - đó vẫn là admin-only trong AdminNewsletter.tsx.",
      }, 400);
    }

    return json({
      error: "Invalid resource",
      valid_resources: ["blog_posts", "tools", "deals", "translations", "categories", "tags", "tasks", "pages", "menus", "reports", "newsletter"],
    }, 400);
  } catch (e) {
    console.error("agent-content-api error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
