import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireEditor, editorStatusOverride } from "../_shared/auth.ts";

// Unified content API for AI writing agents (Task 5).
//
// Lets an "editor" account - e.g. one handed to an outside AI content agent
// via the invite-editor flow - create, update, list, and submit blog posts
// for review through a single stable HTTP contract, instead of needing to
// know Supabase table names/RLS shapes directly. Mirrors the existing
// content-approval model already enforced by the
// 20260906040000_editor_content_workflow_permissions migration and the
// generate-blog-post function:
//   - editors can freely create/edit posts, but can NEVER set
//     status='published' themselves (enforced here in addition to RLS,
//     since this function uses requireEditor + the caller's own client,
//     not service-role, so RLS is the ultimate backstop either way).
//   - admins keep full control; publishing itself still only happens via
//     the existing publish_content() RPC from the admin UI (or an admin
//     calling this same API with action=publish).
//   - every time an editor edits a post that was already 'published', the
//     edit forces it back to 'pending_review' (editorStatusOverride) so it
//     comes off the public site until an admin re-approves it.
//   - submitting for review notifies every admin via the existing
//     `notifications` table (already has an open "Service can create
//     notifications" INSERT policy for this exact purpose) so an admin
//     sees a bell notification instead of needing to poll AdminBlog.
//
// Actions (all via POST body.action):
//   create            -> { title, slug?, content, excerpt?, cover_image_url?,
//                           tags?, seo_title?, seo_description?, seo_keywords?,
//                           related_tool_ids?, submit_for_review? }
//   update             -> { id, ...same fields as create, all optional }
//   get                -> { id } or { slug }
//   list               -> { status?, author_id?, limit?, offset? }
//   submit_for_review  -> { id }
//   publish            -> { id, publish?: boolean } (admin only)
//   delete             -> { id } (admin, or editor deleting own non-published draft)
//
// Auth: Bearer token of an editor or admin account (same as
// generate-blog-post / invite-editor). Uses the CALLER's own Supabase
// client (via requireEditor), so normal RLS applies - this function adds
// no privilege beyond what the editor/admin already has through the SPA.

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

const POST_FIELDS = [
  "title", "slug", "content", "excerpt", "cover_image_url",
  "seo_title", "seo_description",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireEditor(req);
  if (auth instanceof Response) return auth;
  const { user, supabase, role } = auth;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const action = body?.action as string;

    // Best-effort admin-notify helper: looks up every admin user_id and
    // inserts one row per admin. Never throws - a notify failure must not
    // block the actual content write from succeeding.
    async function notifyAdmins(postId: string, title: string, authorLabel: string) {
      try {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (!admins?.length) return;
        const rows = admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          type: "system",
          title: "Bài viết chờ duyệt",
          message: `${authorLabel} đã gửi bài "${title}" chờ admin duyệt trước khi đăng.`,
          link: `/admin/blog?post=${postId}`,
          metadata: { post_id: postId, source: "agent-content-api" },
        }));
        await supabase.from("notifications").insert(rows);
      } catch (e) {
        console.error("notifyAdmins failed (non-fatal):", e);
      }
    }

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
        // Editors can never insert status='published' (RLS blocks it too);
        // an admin caller may still request pending_review explicitly via
        // submit_for_review, otherwise defaults to draft.
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
        await notifyAdmins(data.id, data.title, role === "editor" ? "Editor/AI Agent" : "Admin");
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
      for (const f of POST_FIELDS) if (body[f] !== undefined) payload[f] = body[f];
      if (body.tags !== undefined) payload.tags = toStringArray(body.tags) ?? [];
      if (body.seo_keywords !== undefined) payload.seo_keywords = toStringArray(body.seo_keywords);
      if (body.related_tool_ids !== undefined) payload.related_tool_ids = toStringArray(body.related_tool_ids);
      if (body.slug !== undefined) payload.slug = slugify(body.slug);

      // Never let an editor smuggle status='published' through update; only
      // 'draft'/'pending_review' are accepted from them (RLS enforces this
      // independently too - this is a friendlier 400 instead of a raw RLS
      // rejection).
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
        await notifyAdmins(data.id, data.title, role === "editor" ? "Editor/AI Agent" : "Admin");
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

      await notifyAdmins(data.id, data.title, role === "editor" ? "Editor/AI Agent" : "Admin");
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
      error: "Invalid action",
      valid_actions: ["create", "update", "get", "list", "submit_for_review", "publish", "delete"],
    }, 400);
  } catch (e) {
    console.error("agent-content-api error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
