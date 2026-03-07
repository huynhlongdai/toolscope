import { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

const dictionaries: Record<string, Record<string, string>> = { vi, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "vi",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("locale") as Locale;
    return stored && stored in SUPPORTED_LOCALES ? stored : "vi";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      // Try current locale dictionary, then fallback to vi
      return dictionaries[locale]?.[key] ?? dictionaries["vi"]?.[key] ?? fallback ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
