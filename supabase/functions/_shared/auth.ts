// Shared authentication/authorization helpers for edge functions.
//
// Usage pattern inside a function's serve() handler:
//
//   import { requireAdmin, requireAuth, corsHeaders } from "../_shared/auth.ts";
//   ...
//   const auth = await requireAdmin(req);
//   if (auth instanceof Response) return auth; // unauthorized - short-circuit
//   const { user, supabase } = auth;           // proceed, user is guaranteed admin
//
// IMPORTANT: unlike the ad-hoc checks previously copy-pasted across some
// functions (e.g. manage-ai-keys), these helpers treat a MISSING
// Authorization header as an immediate 401 - they do NOT silently allow
// the request to proceed unauthenticated. This closes the latent bug where
// `if (token) { ...check... }` skipped the check entirely when no token
// was supplied at all.

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Extracts and validates the bearer token from the request, returning the
 * authenticated user + a service-role Supabase client. Returns a Response
 * (401) if there is no token or the token is invalid - callers must check
 * `result instanceof Response` and return it immediately if so.
 */
export async function requireAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return jsonError("Missing Authorization header - login required", 401);
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return jsonError("Invalid or expired session - login required", 401);
  }

  return { user: data.user, supabase };
}

/**
 * Same as requireAuth, but additionally verifies the user has the 'admin'
 * role in user_roles. Returns a Response (401/403) on failure.
 */
export async function requireAdmin(req: Request): Promise<AuthResult | Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, supabase } = authResult;

  const { data: role, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !role) {
    return jsonError("Admin privileges required", 403);
  }

  return { user, supabase };
}

/**
 * Same as requireAuth, but accepts either 'admin' OR 'editor'. Used by the
 * content-generation functions (generate-blog-post, generate-review,
 * generate-tool-article, generate-workflow, generate-ai-score, collect-ai,
 * bulk-collect-tools, translate-*) so an "editor" account - e.g. one handed
 * to an AI content agent per the P0 content-approval workflow - can invoke
 * them. Callers that write rows as a result MUST still force
 * status/is_active to a non-published/inactive value when the resolved
 * `role` here is 'editor' (the DB RLS policies from the
 * 20260906040000_editor_content_workflow_permissions migration enforce
 * this too, but functions use the service-role client which bypasses RLS -
 * so the function itself is the only enforcement point and must not skip
 * this check).
 */
export interface EditorAuthResult extends AuthResult {
  role: "admin" | "editor";
}

export async function requireEditor(req: Request): Promise<EditorAuthResult | Response> {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, supabase } = authResult;

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "editor"]);

  if (error || !roles || roles.length === 0) {
    return jsonError("Editor or admin privileges required", 403);
  }

  const role: "admin" | "editor" = roles.some((r) => r.role === "admin") ? "admin" : "editor";

  return { user, supabase, role };
}

/**
 * Guard for edge functions that write directly to `tools`/`blog_posts`/
 * `workflows` via the service-role client (bypassing RLS). Content-approval
 * RLS from the 20260906040000 migration only protects direct client writes;
 * these service-role writes have no other gate, so every function that
 * mutates a row an editor didn't just create MUST call this first.
 *
 * If `role` is 'editor' and the row's current status is already
 * 'published', returns 'pending_review' so the caller merges it into its
 * update payload - this un-publishes the row (removing it from public
 * listings that filter on status='published') the moment an editor/AI
 * agent changes its content, forcing a fresh admin review before it goes
 * live again. Returns undefined when no override is needed (row isn't
 * published yet, or caller is admin - admins may edit published rows
 * in place without triggering a re-review).
 */
export function editorStatusOverride(
  role: "admin" | "editor",
  currentStatus: string | null | undefined
): "pending_review" | undefined {
  if (role === "editor" && currentStatus === "published") {
    return "pending_review";
  }
  return undefined;
}

// ── Agent API tokens (machine credentials for AI agents) ───────────────
//
// Long-lived, revocable tokens that let an AI agent call agent-content-api
// WITHOUT going through the human-only invite-editor email/password flow.
// A token looks like `sk_agent_<43 random url-safe base64 chars>` and maps
// (via the SHA-256 hash stored in agent_api_keys.token_hash - never the
// plaintext) to an existing editor/admin `user_id`. See the
// 20260907120000_agent_api_keys migration for the table shape and
// supabase/functions/manage-agent-tokens for the admin-facing create/
// list/revoke API.

export const AGENT_TOKEN_PREFIX = "sk_agent_";

/**
 * SHA-256 hash of a token, hex-encoded. Used both when minting a new
 * token (manage-agent-tokens) and when validating one on every request
 * (requireEditorOrAgentToken) - only the hash is ever persisted.
 */
export async function hashAgentToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a new plaintext agent token. Only ever shown to the admin
 * once, at creation time - the caller must hash it (hashAgentToken) before
 * persisting, and must not log/store the plaintext anywhere.
 */
export function generateAgentToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${AGENT_TOKEN_PREFIX}${b64}`;
}

/**
 * Like requireEditor, but ALSO accepts a Bearer value that is an agent API
 * token (see AGENT_TOKEN_PREFIX) instead of a Supabase session JWT. This
 * is what lets a fully automated AI agent call agent-content-api using a
 * token an admin generated in Admin -> Agent Tokens, with no email/
 * password/login step at all.
 *
 * Resolution order for the Bearer value:
 *   1. Starts with `sk_agent_` -> look up agent_api_keys by hash. Must be
 *      unrevoked and unexpired. On success, best-effort bumps
 *      last_used_at and returns the SAME shape as requireEditor (role
 *      resolved from the token owner's real user_roles row), so callers
 *      don't need to special-case anything.
 *   2. Otherwise -> falls through to the normal requireEditor (session
 *      JWT) path, so nothing changes for human editors/admins using the
 *      SPA.
 */
export async function requireEditorOrAgentToken(req: Request): Promise<EditorAuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (token && token.startsWith(AGENT_TOKEN_PREFIX)) {
    const supabase = getServiceClient();
    const tokenHash = await hashAgentToken(token);

    const { data: key, error: keyError } = await supabase
      .from("agent_api_keys")
      .select("id, user_id, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (keyError || !key) {
      return jsonError("Invalid agent token", 401);
    }
    if (key.revoked_at) {
      return jsonError("Agent token has been revoked", 401);
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return jsonError("Agent token has expired", 401);
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", key.user_id)
      .in("role", ["admin", "editor"]);

    if (rolesError || !roles || roles.length === 0) {
      return jsonError("Token owner no longer has editor/admin privileges", 403);
    }

    const { data: userData } = await supabase.auth.admin.getUserById(key.user_id);
    if (!userData?.user) {
      return jsonError("Token owner account no longer exists", 401);
    }

    // Best-effort - a failure here must never block the actual request.
    supabase
      .from("agent_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id)
      .then(() => {})
      .catch(() => {});

    const role: "admin" | "editor" = roles.some((r) => r.role === "admin") ? "admin" : "editor";
    return { user: userData.user, supabase, role };
  }

  return requireEditor(req);
}
