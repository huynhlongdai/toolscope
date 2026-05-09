import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import vi from "@/lib/translations/vi";
import en from "@/lib/translations/en";

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

const dictionaries: Record<string, Record<string, string>> = { vi, en };

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

  // Load system translation overrides from DB
  const { data: dbOverrides } = useQuery({
    queryKey: ["system-translations-override", locale],
    queryFn: async () => {
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
      return map;
    },
    enabled: locale !== "vi",
    staleTime: 5 * 60 * 1000,
  });

  const t = useCallback(
    (key: string, fallback?: string) => {
      // Priority: DB override > static file > vi fallback > fallback > key
      if (dbOverrides?.[key]) return dbOverrides[key];
      return dictionaries[locale]?.[key] ?? dictionaries["vi"]?.[key] ?? fallback ?? key;
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
