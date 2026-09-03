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
