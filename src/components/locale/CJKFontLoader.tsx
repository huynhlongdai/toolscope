import { useEffect } from "react";
import { useI18n, Locale } from "@/lib/i18n";

/**
 * Dynamically loads optimized CJK font subsets based on the active locale.
 * Uses Google Fonts with `display=swap` and `&subset=` for minimal payload.
 *
 * Only loads fonts for CJK + Thai locales that need special font support.
 * Latin-script locales (en, vi, es, fr, pt, de, id) use Inter/system fonts.
 */

interface FontConfig {
  family: string;
  weights: string;
  subsets: string;
}

const LOCALE_FONTS: Partial<Record<Locale, FontConfig>> = {
  zh: {
    family: "Noto+Sans+SC",
    weights: "400;500;700",
    subsets: "chinese-simplified",
  },
  ja: {
    family: "Noto+Sans+JP",
    weights: "400;500;700",
    subsets: "japanese",
  },
  ko: {
    family: "Noto+Sans+KR",
    weights: "400;500;700",
    subsets: "korean",
  },
  th: {
    family: "Noto+Sans+Thai",
    weights: "400;500;700",
    subsets: "thai",
  },
};

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();

function buildGoogleFontsUrl(config: FontConfig): string {
  return `https://fonts.googleapis.com/css2?family=${config.family}:wght@${config.weights}&display=swap&subset=${config.subsets}`;
}

export function CJKFontLoader() {
  const { locale } = useI18n();

  useEffect(() => {
    const fontConfig = LOCALE_FONTS[locale];
    if (!fontConfig) return;

    const fontKey = fontConfig.family;
    if (loadedFonts.has(fontKey)) return;

    // Preconnect to Google Fonts (if not already)
    const preconnectOrigins = [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ];
    preconnectOrigins.forEach((origin) => {
      if (!document.querySelector(`link[href="${origin}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    });

    // Load font stylesheet
    const href = buildGoogleFontsUrl(fontConfig);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.locale = locale;
    document.head.appendChild(link);

    loadedFonts.add(fontKey);

    // Add font-family to body for this locale
    const familyName = fontConfig.family.replace(/\+/g, " ");
    document.documentElement.style.setProperty(
      "--font-cjk",
      `'${familyName}', sans-serif`
    );

    return () => {
      // Don't remove the link — it stays cached for the session
      // Just reset the CSS variable if locale changes
    };
  }, [locale]);

  // Reset CSS variable when switching to non-CJK locale
  useEffect(() => {
    if (!LOCALE_FONTS[locale]) {
      document.documentElement.style.removeProperty("--font-cjk");
    }
  }, [locale]);

  return null;
}
