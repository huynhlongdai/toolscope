import { useCallback } from "react";
import { useI18n, Locale } from "@/lib/i18n";

const DEFAULT_LOCALE: Locale = "en";

/**
 * Hook that provides locale-aware path generation.
 *
 * English (default) → no prefix: `/tools`
 * Other locales → prefix: `/ja/tools`, `/vi/tools`
 */
export function useLocalePath() {
  const { locale } = useI18n();

  /**
   * Generate a locale-prefixed path.
   * @param path - The path without locale prefix (e.g., "/tools")
   * @param targetLocale - Optional override locale
   */
  const localePath = useCallback(
    (path: string, targetLocale?: Locale): string => {
      const loc = targetLocale || locale;

      // Default locale (English) = no prefix
      if (loc === DEFAULT_LOCALE) return path;

      // Ensure path starts with /
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;

      return `/${loc}${normalizedPath}`;
    },
    [locale]
  );

  /**
   * Get the current locale for URL context.
   */
  const isDefaultLocale = locale === DEFAULT_LOCALE;

  return { localePath, locale, isDefaultLocale };
}
