import { useEffect, useRef } from "react";
import { useI18n, Locale, SUPPORTED_LOCALES } from "@/lib/i18n";

const STORAGE_KEY = "locale_auto_detected";

/**
 * Auto-detects browser language on first visit and sets locale accordingly.
 * Only runs once (stores flag in localStorage). Users can override manually.
 */
export function useAutoLocale() {
  const { locale, setLocale } = useI18n();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

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
  }, [locale, setLocale]);
}
