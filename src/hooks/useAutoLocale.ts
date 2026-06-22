import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useI18n, Locale, SUPPORTED_LOCALES } from "@/lib/i18n";

const STORAGE_KEY = "locale_auto_detected";
const VALID_LOCALES = new Set(Object.keys(SUPPORTED_LOCALES));

/**
 * Auto-detects locale from:
 * 1. URL path prefix (highest priority): /ja/tools → Japanese
 * 2. Browser language (first visit only, stored in localStorage)
 */
export function useAutoLocale() {
  const { locale, setLocale } = useI18n();
  const { pathname } = useLocation();
  const didBrowserDetect = useRef(false);

  // 1. Sync locale from URL path prefix (runs on every navigation)
  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0 && VALID_LOCALES.has(parts[0])) {
      const urlLocale = parts[0] as Locale;
      if (urlLocale !== locale && urlLocale !== "en") {
        setLocale(urlLocale);
      }
    }
  }, [pathname, locale, setLocale]);

  // 2. Browser language detection (first visit only)
  useEffect(() => {
    if (didBrowserDetect.current) return;
    didBrowserDetect.current = true;

    // Skip if URL has a locale prefix (URL takes priority)
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0 && VALID_LOCALES.has(parts[0])) return;

    // Skip if user already manually chose a locale
    if (localStorage.getItem("locale")) return;
    // Skip if already auto-detected
    if (localStorage.getItem(STORAGE_KEY)) return;

    const browserLang = navigator.language?.toLowerCase() || "";
    const supportedKeys = Object.keys(SUPPORTED_LOCALES) as Locale[];

    // Try exact match first (e.g., "pt-br" → "pt")
    let matched: Locale | null = null;
    const langPrefix = browserLang.split("-")[0];

    for (const key of supportedKeys) {
      if (browserLang === key || browserLang.startsWith(key + "-")) {
        matched = key;
        break;
      }
    }
    if (!matched && langPrefix) {
      matched = supportedKeys.find((k) => k === langPrefix) || null;
    }

    if (matched && matched !== locale) {
      setLocale(matched);
    }

    localStorage.setItem(STORAGE_KEY, "1");
  }, [locale, setLocale, pathname]);
}
