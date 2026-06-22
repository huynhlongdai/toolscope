import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SUPPORTED_LOCALES, Locale } from "@/lib/i18n";

/**
 * Auto-generates hreflang alternate links for all supported locales.
 * Uses ?lang=xx query parameter for locale switching.
 * Place once in the app, alongside <ScrollToTop>.
 */
export function HreflangMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Clean up previous
    document.querySelectorAll('link[data-auto-hreflang]').forEach((el) => el.remove());

    const origin = window.location.origin;
    const locales = Object.keys(SUPPORTED_LOCALES) as Locale[];

    locales.forEach((lang) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang;
      link.href = `${origin}${pathname}${lang === "en" ? "" : `?lang=${lang}`}`;
      link.setAttribute("data-auto-hreflang", "true");
      document.head.appendChild(link);
    });

    // x-default (English is the default)
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${origin}${pathname}`;
    xDefault.setAttribute("data-auto-hreflang", "true");
    document.head.appendChild(xDefault);

    return () => {
      document.querySelectorAll('link[data-auto-hreflang]').forEach((el) => el.remove());
    };
  }, [pathname]);

  return null;
}
