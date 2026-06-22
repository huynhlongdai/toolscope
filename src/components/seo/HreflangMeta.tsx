import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SUPPORTED_LOCALES, Locale } from "@/lib/i18n";

const DEFAULT_LOCALE: Locale = "en";
const VALID_LOCALES = new Set(Object.keys(SUPPORTED_LOCALES));

/**
 * Auto-generates hreflang alternate links for all supported locales.
 * Uses path prefix for non-default locales: /ja/tools, /vi/tools
 * Default (English): /tools (no prefix)
 */
export function HreflangMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Clean up previous
    document.querySelectorAll('link[data-auto-hreflang]').forEach((el) => el.remove());

    const origin = window.location.origin;
    const locales = Object.keys(SUPPORTED_LOCALES) as Locale[];

    // Strip any existing locale prefix from pathname to get the base path
    const pathParts = pathname.split("/").filter(Boolean);
    let basePath = pathname;
    if (pathParts.length > 0 && VALID_LOCALES.has(pathParts[0])) {
      basePath = "/" + pathParts.slice(1).join("/") || "/";
    }

    locales.forEach((lang) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang;
      // Default locale (English) = no prefix; others get /:locale prefix
      if (lang === DEFAULT_LOCALE) {
        link.href = `${origin}${basePath}`;
      } else {
        link.href = `${origin}/${lang}${basePath === "/" ? "" : basePath}`;
      }
      link.setAttribute("data-auto-hreflang", "true");
      document.head.appendChild(link);
    });

    // x-default points to English (no prefix)
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${origin}${basePath}`;
    xDefault.setAttribute("data-auto-hreflang", "true");
    document.head.appendChild(xDefault);

    return () => {
      document.querySelectorAll('link[data-auto-hreflang]').forEach((el) => el.remove());
    };
  }, [pathname]);

  return null;
}
