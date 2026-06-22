import { useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useI18n, SUPPORTED_LOCALES, Locale } from "@/lib/i18n";

const VALID_LOCALES = new Set(Object.keys(SUPPORTED_LOCALES));
const DEFAULT_LOCALE: Locale = "en";

/**
 * Layout wrapper that syncs URL locale prefix → i18n context.
 * Used as parent route element for `/:locale/*` routes.
 *
 * - `/ja/tools` → sets locale to "ja", renders <ToolsPage />
 * - `/en/tools` → redirects to `/tools` (English is default, no prefix)
 * - `/tools`    → keeps locale as-is (English default)
 */
export function LocaleLayout() {
  const { locale: urlLocale } = useParams<{ locale: string }>();
  const { locale: currentLocale, setLocale } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!urlLocale) return; // No locale in URL, keep current

    // Validate locale
    if (!VALID_LOCALES.has(urlLocale)) return;

    const targetLocale = urlLocale as Locale;

    // If English (default), redirect to URL without prefix
    if (targetLocale === DEFAULT_LOCALE) {
      const pathWithoutLocale = window.location.pathname.replace(
        new RegExp(`^/${DEFAULT_LOCALE}(/|$)`),
        "/"
      );
      navigate(pathWithoutLocale || "/", { replace: true });
      return;
    }

    // Set locale from URL
    if (currentLocale !== targetLocale) {
      setLocale(targetLocale);
    }
  }, [urlLocale, currentLocale, setLocale, navigate]);

  return <Outlet />;
}

/**
 * Default layout for routes without locale prefix (English default).
 */
export function DefaultLocaleLayout() {
  return <Outlet />;
}
