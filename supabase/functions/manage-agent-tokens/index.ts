import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  requireAdmin,
  generateAgentToken,
  hashAgentToken,
  AGENT_TOKEN_PREFIX,
} from "../_shared/auth.ts";

// Admin-only API to create/list/revoke agent API tokens (machine
// credentials for AI agents) - see the 20260907120000_agent_api_keys
// migration and requireEditorOrAgentToken (_shared/auth.ts) for how these
// tokens are validated on the agent-content-api side.
//
// This exists because the only prior way to give an AI agent access
// (invite-editor) requires a human to receive a real email and click a
// magic link to set a password - unusable for a fully automated agent.
// Actions (all via POST body.action):
//
//   list_editors   -> {} - lists existing editor/admin accounts an admin
//                     can attach a new token to, so they don't have to
//                     create a brand new account for every token.
//   list_tokens    -> {} - lists all agent_api_keys (never the plaintext
//                     token, only id/name/prefix/owner/created/expires/
//                     revoked/last_used) for the Admin UI table.
//   create_token   -> { name, user_id?, new_account_email?, expires_in_days? }
//                     Exactly one of user_id / new_account_email must be
//                     given:
//                       - user_id: attach the new token to an EXISTING
//                         editor/admin account.
//                       - new_account_email: create a brand new HEADLESS
//                         account (no email sent, no password set) via
//                         supabase.auth.admin.createUser(), promote it to
//                         'editor', then attach the token to it. Intended
//                         for a dedicated "AI agent" identity distinct
//                         from any human editor.
//                     Returns { token, id, ... } - `token` (the plaintext
//                     secret) is ONLY ever returned here, once. The admin
//                     must copy it immediately; it cannot be retrieved
//                     again afterwards, only revoked + a new one created.
//   revoke_token   -> { id } - sets revoked_at, keeps the row for audit/
//                     last_used_at history. Revoked tokens are rejected
//                     immediately by requireEditorOrAgentToken.
//   delete_token   -> { id } - permanently removes the row (only really
//                     useful to declutter the list after a revoke).

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { supabase, user: adminUser } = auth;

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "list_editors") {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "editor"]);
      if (rolesError) return jsonResponse({ error: rolesError.message }, 500);

      const userIds = [...new Set((roles || []).map((r) => r.user_id))];
      const roleByUser = new Map<string, string[]>();
      for (const r of roles || []) {
        const arr = roleByUser.get(r.user_id) || [];
        arr.push(r.role);
        roleByUser.set(r.user_id, arr);
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      if (profilesError) return jsonResponse({ error: profilesError.message }, 500);

      const editors = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data: userData } = await supabase.auth.admin.getUserById(p.id);
          return {
            user_id: p.id,
            email: userData?.user?.email || null,
            display_name: p.display_name || p.username || null,
            roles: roleByUser.get(p.id) || [],
          };
        })
      );

      return jsonResponse({ editors });
    }

    if (action === "list_tokens") {
      const { data: keys, error } = await supabase
        .from("agent_api_keys")
        .select("id, user_id, name, token_prefix, created_at, expires_at, revoked_at, last_used_at, created_by")
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);

      const userIds = [...new Set((keys || []).map((k) => k.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const profileById = new Map((profiles || []).map((p) => [p.id, p]));

      const tokens = await Promise.all(
        (keys || []).map(async (k) => {
          const { data: userData } = await supabase.auth.admin.getUserById(k.user_id);
          const profile = profileById.get(k.user_id);
          return {
            id: k.id,
            name: k.name,
            token_prefix: k.token_prefix,
            created_at: k.created_at,
            expires_at: k.expires_at,
            revoked_at: k.revoked_at,
            last_used_at: k.last_used_at,
            owner_email: userData?.user?.email || null,
            owner_display_name: profile?.display_name || profile?.username || null,
          };
        })
      );

      return jsonResponse({ tokens });
    }

    if (action === "create_token") {
      const name = (body?.name ?? "").trim();
      const userIdInput = body?.user_id ? String(body.user_id) : null;
      const newAccountEmail = body?.new_account_email ? String(body.new_account_email).trim().toLowerCase() : null;
      const expiresInDays = body?.expires_in_days ? Number(body.expires_in_days) : null;

      if (!name) return jsonResponse({ error: "Thiếu tên token (name)" }, 400);
      if (!userIdInput && !newAccountEmail) {
        return jsonResponse({ error: "Cần chọn tài khoản có sẵn (user_id) hoặc tạo tài khoản agent mới (new_account_email)" }, 400);
      }
      if (userIdInput && newAccountEmail) {
        return jsonResponse({ error: "Chỉ chọn 1 trong 2: user_id HOẶC new_account_email" }, 400);
      }

      let targetUserId: string;

      if (newAccountEmail) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(newAccountEmail)) {
          return jsonResponse({ error: "Email tài khoản agent không hợp lệ" }, 400);
        }

        // Creates the auth.users row directly, WITHOUT sending any email
        // and WITHOUT a password the agent could log in with via the SPA
        // - unlike invite-editor's inviteUserByEmail(), this account is
        // only ever meant to be reached via its agent API token, never
        // via a normal login form.
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email: newAccountEmail,
          email_confirm: true,
          password: crypto.randomUUID() + crypto.randomUUID(),
          user_metadata: { agent_account: true },
        });

        if (createError) {
          const msg = createError.message || "";
          const alreadyRegistered = /already registered|already exists|already been registered/i.test(msg);
          return jsonResponse(
            {
              error: alreadyRegistered
                ? "Email này đã có tài khoản. Hãy chọn tài khoản có sẵn (user_id) thay vì tạo mới."
                : `Không tạo được tài khoản agent: ${msg}`,
            },
            alreadyRegistered ? 409 : 500
          );
        }

        targetUserId = created!.user!.id;

        // handle_new_user() trigger already inserted a default 'user' row
        // - promote to 'editor' (same delete-then-insert pattern as
        // invite-editor).
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: targetUserId, role: "editor" });
        if (roleError) {
          return jsonResponse({ error: `Tạo tài khoản thành công nhưng gán role thất bại: ${roleError.message}` }, 500);
        }
      } else {
        targetUserId = userIdInput!;

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .in("role", ["admin", "editor"]);
        if (rolesError) return jsonResponse({ error: rolesError.message }, 500);
        if (!roles || roles.length === 0) {
          return jsonResponse({ error: "Tài khoản được chọn không có quyền editor/admin" }, 400);
        }
      }

      const plaintextToken = generateAgentToken();
      const tokenHash = await hashAgentToken(plaintextToken);
      const tokenPrefix = plaintextToken.slice(0, AGENT_TOKEN_PREFIX.length + 8);

      const expiresAt =
        expiresInDays && expiresInDays > 0
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { data: inserted, error: insertError } = await supabase
        .from("agent_api_keys")
        .insert({
          user_id: targetUserId,
          name,
          token_hash: tokenHash,
          token_prefix: tokenPrefix,
          created_by: adminUser.id,
          expires_at: expiresAt,
        })
        .select("id, created_at, expires_at")
        .single();

      if (insertError) return jsonResponse({ error: insertError.message }, 500);

      return jsonResponse({
        success: true,
        token: plaintextToken, // shown exactly once - caller must copy now
        id: inserted.id,
        created_at: inserted.created_at,
        expires_at: inserted.expires_at,
        user_id: targetUserId,
      });
    }

    if (action === "revoke_token") {
      const id = body?.id;
      if (!id) return jsonResponse({ error: "Thiếu id" }, 400);

      const { error } = await supabase
        .from("agent_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({ success: true });
    }

    if (action === "delete_token") {
      const id = body?.id;
      if (!id) return jsonResponse({ error: "Thiếu id" }, 400);

      const { error } = await supabase.from("agent_api_keys").delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({ success: true });
    }

    return jsonResponse(
      { error: "Invalid action", valid_actions: ["list_editors", "list_tokens", "create_token", "revoke_token", "delete_token"] },
      400
    );
  } catch (e) {
    console.error("manage-agent-tokens error:", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
