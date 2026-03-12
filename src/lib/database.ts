import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Import the original local client directly (bypasses Vite alias via relative path)
// We re-export from here so the alias in vite.config.ts redirects all
// `@/integrations/supabase/client` imports to this file.

const LOCAL_URL = import.meta.env.VITE_SUPABASE_URL;
const LOCAL_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── helpers ──────────────────────────────────────────────────────────
export type ActiveDb = 'local' | 'external';

export function getActiveDb(): ActiveDb {
  try {
    return (localStorage.getItem('active_db') as ActiveDb) || 'local';
  } catch {
    return 'local';
  }
}

export function getExternalConfig() {
  try {
    return {
      url: localStorage.getItem('external_supabase_url') || '',
      key: localStorage.getItem('external_supabase_key') || '',
    };
  } catch {
    return { url: '', key: '' };
  }
}

export function switchDatabase(
  mode: ActiveDb,
  externalUrl?: string,
  externalKey?: string,
) {
  localStorage.setItem('active_db', mode);
  if (mode === 'external' && externalUrl && externalKey) {
    localStorage.setItem('external_supabase_url', externalUrl);
    localStorage.setItem('external_supabase_key', externalKey);
  }
  // Reload so every module picks up the new client
  window.location.reload();
}

// ── client creation ──────────────────────────────────────────────────
function buildClient(): SupabaseClient {
  const active = getActiveDb();

  if (active === 'external') {
    const { url, key } = getExternalConfig();
    if (url && key) {
      return createClient(url, key, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      });
    }
    // Fallback to local if external config is missing
    console.warn('[database] External config missing, falling back to local');
  }

  return createClient(LOCAL_URL, LOCAL_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
}

export const supabase = buildClient();
