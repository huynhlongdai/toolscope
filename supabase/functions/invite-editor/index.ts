import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

// Invite a new editor account by email (P0-5).
//
// Admin-only (requireAdmin) - only an admin may create editor accounts,
// consistent with the "Admins can manage roles" RLS policy on user_roles
// which already blocks non-admins from writing to that table directly.
// This function uses the service-role client (via requireAdmin's `auth`)
// to call the Supabase Auth Admin API, which regular RLS-scoped clients
// cannot do.
//
// Flow:
//   1. Validate email.
//   2. supabase.auth.admin.inviteUserByEmail(email) - creates the auth.users
//      row and sends Supabase's built-in "you've been invited" email with a
//      magic link the invitee uses to set their own password. This also
//      fires the existing `handle_new_user()` trigger, which inserts a
//      default 'user' row into user_roles and creates a `profiles` row.
//   3. Replace that default 'user' role with 'editor' (delete-then-insert,
//      same pattern AdminUsers.tsx's updateRoleMutation already uses for
//      role changes) so the invitee lands with editor access as soon as
//      they accept the invite - no separate manual promotion step needed.
//   4. Audit-log the invite via the caller (AdminUsers.tsx calls
//      logAuditAction itself on success, matching the existing convention
//      where the UI - not the edge function - is responsible for audit
//      logging admin actions).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { supabase } = auth;
    const body = await req.json();
    const email = (body?.email ?? "").trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      return new Response(JSON.stringify({ error: "Email không hợp lệ" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject if a profile with this email already exists as an auth user.
    // listUsers doesn't support filtering by email directly on this SDK
    // version, so we rely on inviteUserByEmail's own "already registered"
    // error instead of a separate pre-check (avoids a second network call
    // and a TOCTOU gap between check and invite).
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get("SITE_URL") || "https://astute.tools"}/auth`,
    });

    if (inviteError) {
      const msg = inviteError.message || "";
      const alreadyRegistered = /already registered|already exists|already been registered/i.test(msg);
      return new Response(
        JSON.stringify({
          error: alreadyRegistered
            ? "Email này đã có tài khoản. Hãy đổi role qua danh sách Users thay vì mời lại."
            : `Không thể gửi lời mời: ${msg}`,
        }),
        { status: alreadyRegistered ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) {
      return new Response(JSON.stringify({ error: "Không lấy được user id sau khi mời" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // handle_new_user() trigger already inserted a default 'user' role row
    // for newUserId by this point (trigger runs synchronously on the
    // auth.users INSERT that inviteUserByEmail performs). Promote to
    // 'editor' with the same delete-then-insert pattern used everywhere
    // else in the admin UI for role changes.
    const { error: deleteRoleError } = await supabase.from("user_roles").delete().eq("user_id", newUserId);
    if (deleteRoleError) {
      return new Response(JSON.stringify({ error: `Mời thành công nhưng gán role thất bại: ${deleteRoleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertRoleError } = await supabase.from("user_roles").insert({ user_id: newUserId, role: "editor" });
    if (insertRoleError) {
      return new Response(JSON.stringify({ error: `Mời thành công nhưng gán role thất bại: ${insertRoleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("invite-editor error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
