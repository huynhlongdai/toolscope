import { useNavigate, useLocation } from "react-router-dom";
import { useI18n, SUPPORTED_LOCALES, Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const DEFAULT_LOCALE: Locale = "en";
const VALID_LOCALES = new Set(Object.keys(SUPPORTED_LOCALES));

/**
 * Language switcher that navigates to locale-prefixed URLs.
 * English → /tools (no prefix)
 * Other → /ja/tools, /vi/tools, etc.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Strip any existing locale prefix from current path
    const pathParts = pathname.split("/").filter(Boolean);
    let basePath = pathname;
    if (pathParts.length > 0 && VALID_LOCALES.has(pathParts[0])) {
      basePath = "/" + pathParts.slice(1).join("/") || "/";
    }

    // Set locale in context
    setLocale(newLocale);

    // Navigate to new locale URL
    if (newLocale === DEFAULT_LOCALE) {
      navigate(basePath);
    } else {
      navigate(`/${newLocale}${basePath === "/" ? "" : basePath}`);
    }
  };

  const localeEntries = Object.entries(SUPPORTED_LOCALES) as [Locale, string][];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="uppercase text-xs font-medium">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
        {localeEntries.map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLocaleChange(code)}
            className={locale === code ? "bg-accent font-medium" : ""}
          >
            <span className="uppercase text-xs w-6 text-muted-foreground">{code}</span>
            <span className="ml-2">{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
