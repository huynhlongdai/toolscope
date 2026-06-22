import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Prefetches locale-specific translation chunks and adjacent routes
 * based on current navigation to reduce perceived load time.
 *
 * Strategy:
 * - On tools page → prefetch tool detail + category pages
 * - On home page → prefetch tools page
 * - On blog listing → prefetch blog detail
 * - Uses requestIdleCallback for non-blocking prefetch
 */

const PREFETCH_MAP: Record<string, string[]> = {
  "/": ["/tools", "/categories", "/blog", "/deals"],
  "/tools": ["/categories"],
  "/blog": [],
  "/categories": ["/tools"],
  "/deals": ["/tools"],
};

// Track what we've already prefetched this session
const prefetched = new Set<string>();

function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  prefetched.add(path);

  // Create a hidden link element for browser-level prefetch
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = path;
  link.as = "document";
  document.head.appendChild(link);

  // Clean up after 30s
  setTimeout(() => {
    try { document.head.removeChild(link); } catch {}
  }, 30000);
}

export function useRoutePrefetch() {
  const { pathname } = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const doPrefetch = useCallback(() => {
    // Normalize pathname: strip locale prefix
    const parts = pathname.split("/").filter(Boolean);
    let basePath = pathname;

    const locales = new Set(["vi", "zh", "ja", "ko", "th", "id", "es", "fr", "pt", "de"]);
    if (parts.length > 0 && locales.has(parts[0])) {
      basePath = "/" + parts.slice(1).join("/") || "/";
    }

    const targets = PREFETCH_MAP[basePath];
    if (!targets) return;

    // Use requestIdleCallback if available, else setTimeout
    const schedule = typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 200);

    schedule(() => {
      targets.forEach((t) => {
        // Prefetch with locale prefix if applicable
        if (parts.length > 0 && locales.has(parts[0])) {
          prefetchRoute(`/${parts[0]}${t}`);
        } else {
          prefetchRoute(t);
        }
      });
    });
  }, [pathname]);

  useEffect(() => {
    // Wait a bit after navigation before prefetching
    timerRef.current = setTimeout(doPrefetch, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doPrefetch]);
}
