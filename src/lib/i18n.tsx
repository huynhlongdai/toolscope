import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Locale = "vi" | "en";

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (vi: string, en: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "vi",
  setLocale: () => {},
  t: (vi) => vi,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem("locale") as Locale) || "vi";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const t = useCallback((vi: string, en: string) => locale === "vi" ? vi : en, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
