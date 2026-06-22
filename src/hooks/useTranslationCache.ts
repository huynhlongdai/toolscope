import { useCallback, useRef } from "react";

const CACHE_PREFIX = "i18n_cache_";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 50; // per entity type

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  locale: string;
}

/**
 * Client-side translation cache with localStorage persistence.
 * Stores DB translation overrides for 30 minutes to reduce Supabase queries.
 */
export function useTranslationCache() {
  const memoryCache = useRef<Map<string, CacheEntry<Record<string, string>>>>(new Map());

  const getCacheKey = useCallback((entityType: string, entityId: string, locale: string) => {
    return `${CACHE_PREFIX}${entityType}_${entityId}_${locale}`;
  }, []);

  const get = useCallback(
    (entityType: string, entityId: string, locale: string): Record<string, string> | null => {
      const key = getCacheKey(entityType, entityId, locale);

      // Check memory cache first
      const memEntry = memoryCache.current.get(key);
      if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL) {
        return memEntry.data;
      }

      // Check localStorage
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry<Record<string, string>> = JSON.parse(stored);
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            // Promote to memory cache
            memoryCache.current.set(key, entry);
            return entry.data;
          }
          // Expired — clean up
          localStorage.removeItem(key);
        }
      } catch {
        // Corrupted cache entry
      }

      return null;
    },
    [getCacheKey],
  );

  const set = useCallback(
    (entityType: string, entityId: string, locale: string, data: Record<string, string>) => {
      const key = getCacheKey(entityType, entityId, locale);
      const entry: CacheEntry<Record<string, string>> = {
        data,
        timestamp: Date.now(),
        locale,
      };

      // Memory cache
      memoryCache.current.set(key, entry);

      // localStorage (best-effort, may fail in private browsing)
      try {
        localStorage.setItem(key, JSON.stringify(entry));
        evictOldEntries(entityType);
      } catch {
        // Storage full or blocked — memory cache still works
      }
    },
    [getCacheKey],
  );

  const invalidate = useCallback(
    (entityType?: string, entityId?: string, locale?: string) => {
      if (!entityType) {
        // Clear all translation caches
        memoryCache.current.clear();
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}
        return;
      }

      if (entityId && locale) {
        const key = getCacheKey(entityType, entityId, locale);
        memoryCache.current.delete(key);
        try { localStorage.removeItem(key); } catch {}
      } else {
        // Invalidate all for this entity type
        const prefix = `${CACHE_PREFIX}${entityType}_`;
        const keysToRemove: string[] = [];
        memoryCache.current.forEach((_, k) => {
          if (k.startsWith(prefix)) keysToRemove.push(k);
        });
        keysToRemove.forEach((k) => {
          memoryCache.current.delete(k);
          try { localStorage.removeItem(k); } catch {}
        });
      }
    },
    [getCacheKey],
  );

  return { get, set, invalidate };
}

/** Evict oldest entries for an entity type if over limit */
function evictOldEntries(entityType: string) {
  try {
    const prefix = `${CACHE_PREFIX}${entityType}_`;
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || "{}");
          entries.push({ key, timestamp: val.timestamp || 0 });
        } catch {
          entries.push({ key, timestamp: 0 });
        }
      }
    }

    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
      toRemove.forEach((e) => localStorage.removeItem(e.key));
    }
  } catch {}
}
