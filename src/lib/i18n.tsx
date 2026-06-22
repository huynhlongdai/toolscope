import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import vi from "@/lib/translations/vi";
import en from "@/lib/translations/en";
import zh from "@/lib/translations/zh";
import ja from "@/lib/translations/ja";
import ko from "@/lib/translations/ko";
import th from "@/lib/translations/th";
import id from "@/lib/translations/id";
import es from "@/lib/translations/es";
import fr from "@/lib/translations/fr";
import pt from "@/lib/translations/pt";
import de from "@/lib/translations/de";

export type Locale = "vi" | "en" | "zh" | "ja" | "ko" | "th" | "id" | "es" | "fr" | "pt" | "de";

export const SUPPORTED_LOCALES: Record<Locale, { label: string; flag: string; nativeName: string }> = {
  vi: { label: "Tiếng Việt", flag: "🇻🇳", nativeName: "Tiếng Việt" },
  en: { label: "English", flag: "🇺🇸", nativeName: "English" },
  zh: { label: "Chinese", flag: "🇨🇳", nativeName: "中文" },
  ja: { label: "Japanese", flag: "🇯🇵", nativeName: "日本語" },
  ko: { label: "Korean", flag: "🇰🇷", nativeName: "한국어" },
  th: { label: "Thai", flag: "🇹🇭", nativeName: "ภาษาไทย" },
  id: { label: "Indonesian", flag: "🇮🇩", nativeName: "Bahasa Indonesia" },
  es: { label: "Spanish", flag: "🇪🇸", nativeName: "Español" },
  fr: { label: "French", flag: "🇫🇷", nativeName: "Français" },
  pt: { label: "Portuguese", flag: "🇧🇷", nativeName: "Português" },
  de: { label: "German", flag: "🇩🇪", nativeName: "Deutsch" },
};

const SYSTEM_ENTITY_ID = "00000000-0000-0000-0000-000000000001";
const CACHE_KEY_PREFIX = "i18n_sys_";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const dictionaries: Record<string, Record<string, string>> = { vi, en, zh, ja, ko, th, id, es, fr, pt, de };

/** Try to read system override cache from localStorage */
function readCachedOverrides(locale: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${locale}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${locale}`);
  } catch {}
  return null;
}

/** Save system override cache to localStorage */
function writeCachedOverrides(locale: string, data: Record<string, string>) {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${locale}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("locale") as Locale;
    return stored && stored in SUPPORTED_LOCALES ? stored : "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  // Load system translation overrides from DB with localStorage cache
  const { data: dbOverrides } = useQuery({
    queryKey: ["system-translations-override", locale],
    queryFn: async () => {
      // Check localStorage cache first
      const cached = readCachedOverrides(locale);
      if (cached) return cached;

      const { data, error } = await supabase
        .from("translations")
        .select("field_name, translated_text")
        .eq("entity_type", "system")
        .eq("entity_id", SYSTEM_ENTITY_ID)
        .eq("locale", locale);
      if (error) return {};
      const map: Record<string, string> = {};
      data?.forEach((row: any) => {
        map[row.field_name] = row.translated_text;
      });
      // Persist to localStorage
      writeCachedOverrides(locale, map);
      return map;
    },
    enabled: locale !== "en",
    staleTime: 30 * 60 * 1000, // 30 min (matches localStorage TTL)
    gcTime: 60 * 60 * 1000,    // 1 hour garbage collection
  });

  const t = useCallback(
    (key: string, fallback?: string) => {
      // Priority: DB override > static file > en fallback > vi fallback > fallback > key
      if (dbOverrides?.[key]) return dbOverrides[key];
      return dictionaries[locale]?.[key] ?? dictionaries["en"]?.[key] ?? dictionaries["vi"]?.[key] ?? fallback ?? key;
    },
    [locale, dbOverrides]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
