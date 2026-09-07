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
//     create/update/get/list/activate_deal/delete
//     -> { tool_id (bắt buộc khi create), title, description?, coupon_code?,
//          discount_type?, discount_value?, deal_url?, original_price?,
//          deal_price?, currency?, starts_at?, expires_at?, is_verified?,
//          is_exclusive? }
//     - KHÔNG có action publish/submit_for_review riêng cho deals - dùng
//       action=activate_deal (admin only, tương đương publish) thay vì
//       publish_content() RPC vì deals dùng is_active không dùng status.
//
//   resource = "translations"
//     create (=upsert)/get/list/delete  — không có update/publish riêng,
//     "create" luôn upsert theo (entity_type, entity_id, locale, field_name)
//     -> { entity_type (blog|tool|deal|workflow), entity_id, locale,
//          fields: { field_name: text, ... } }  — 1 lần gọi ghi nhiều field
//        HOẶC { entity_type, entity_id, locale, field_name, translated_text }
//        — 1 field mỗi lần gọi, tuỳ agent thích dùng cách nào.
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
] as const;

const VALID_ENTITY_TYPES = ["blog", "tool", "deal", "workflow"] as const;

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

        const payload: Record<string, unknown> = {
          tool_id: body.tool_id,
          title: body.title,
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
          // Editors (incl. AI agent) can NEVER insert is_active=true - the
          // DB RLS ("Editors can insert inactive deals") would reject it
          // anyway, but this gives a friendlier 200-with-inactive instead
          // of a raw RLS rejection. Admin may activate immediately.
          is_active: role === "admin" ? (body.is_active ?? true) : false,
        };

        const { data, error } = await supabase.from("deals").insert(payload).select().single();
        if (error) return json({ error: error.message }, 500);

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

      if (action === "get") {
        if (!body.id) return json({ error: "Cần id" }, 400);
        const { data, error } = await supabase.from("deals").select("*, tools(name, slug)").eq("id", body.id).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy deal" }, 404);
        return json({ deal: data });
      }

      if (action === "list") {
        const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = supabase.from("deals").select("id, tool_id, title, coupon_code, discount_type, discount_value, is_active, is_verified, is_exclusive, expires_at, created_at, created_by", { count: "exact" });
        if (body.is_active !== undefined) query = query.eq("is_active", body.is_active);
        if (body.tool_id) query = query.eq("tool_id", body.tool_id);
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
        valid_actions: ["create", "update", "get", "list", "activate_deal", "delete"],
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

    return json({
      error: "Invalid resource",
      valid_resources: ["blog_posts", "tools", "deals", "translations"],
    }, 400);
  } catch (e) {
    console.error("agent-content-api error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
