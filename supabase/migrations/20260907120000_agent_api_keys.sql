-- Agent API Keys: machine-usable tokens for AI agents (replaces the
-- email-invite-only flow as the ONLY way to provision agent access).
--
-- Problem this solves: until now, the only way to give an AI agent access
-- to agent-content-api was invite-editor, which creates a full Supabase
-- Auth user and sends a REAL email with a magic link that a HUMAN must
-- click to set a password before any Bearer JWT can be obtained. An
-- automated AI agent cannot click an email link, so this path was
-- unusable for actual machine-to-machine provisioning.
--
-- This migration adds a table to store hashed, revocable, optionally
-- expiring tokens (format `sk_agent_<random>`, see _shared/auth.ts's
-- AGENT_TOKEN_PREFIX) that map to a `user_id` (an editor/admin account -
-- either a dedicated headless "agent" account created without sending any
-- email via supabase.auth.admin.createUser(), or an existing human
-- editor/admin account). agent-content-api accepts either a normal
-- session JWT OR one of these tokens (see requireEditorOrAgentToken in
-- _shared/auth.ts) - callers just swap the Bearer value, no other change.
--
-- Only the SHA-256 hash of the token is stored - the plaintext is shown to
-- the admin exactly once at creation time (manage-agent-tokens' "create"
-- action) and can never be retrieved again, only revoked + reissued.

CREATE TABLE public.agent_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  -- First ~16 chars of the plaintext token (e.g. "sk_agent_ab12cd") kept
  -- around purely so the admin list UI can show *something* identifying
  -- without ever storing/retrieving the full secret.
  token_prefix TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_api_keys_user_id ON public.agent_api_keys(user_id);

ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins may see/manage tokens via the normal (RLS-scoped) client.
-- In practice manage-agent-tokens and the auth lookup in
-- requireEditorOrAgentToken both use the service-role client and bypass
-- this anyway, but RLS is kept as defense-in-depth against any future
-- direct-client usage of this table.
CREATE POLICY "Admins can manage agent api keys" ON public.agent_api_keys
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
