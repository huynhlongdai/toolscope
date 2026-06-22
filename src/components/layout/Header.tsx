import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, Menu, X, Bookmark, User, LogOut, Shield, Globe, Check, ChevronDown } from "lucide-react";
import { CommandPalette } from "@/components/search/CommandPalette";
import { initTheme, setStoredTheme, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useI18n, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useModules } from "@/hooks/useModules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  label: string;
  url: string;
  open_new_tab?: boolean;
  children?: MenuItem[];
}

const defaultNavItems: MenuItem[] = [
  { label: "Explore", url: "/tools" },
  { label: "Categories", url: "/categories" },
  { label: "Deals", url: "/deals" },
  { label: "Blog", url: "/blog" },
];

const moreNavItems: MenuItem[] = [
  { label: "Trending", url: "/trending" },
  { label: "Tasks", url: "/tasks" },
  { label: "Launches", url: "/launches" },
  { label: "Workflows", url: "/workflows" },
  { label: "Collections", url: "/collections" },
  { label: "Leaderboard", url: "/leaderboard" },
];

// URL prefix → module ID mapping for nav filtering
const URL_MODULE_MAP: Record<string, string> = {
  "/tools": "",
  "/trending": "",
  "/categories": "",
  "/tasks": "tasks",
  "/launches": "launches",
  "/workflows": "workflows",
  "/deals": "deals",
  "/blog": "blog",
  "/collections": "collections",
  "/compare": "compare",
  "/leaderboard": "leaderboard",
  "/submit": "submit_tool",
};

export function Header() {
  const [theme, setTheme] = useState<Theme>(initTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = theme === "dark";
  const { user, signOut } = useAuth();
  const { isAdminOrEditor } = useAdminAuth();
  const { locale, setLocale, t } = useI18n();
  const { isEnabled } = useModules();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const VALID_LOCALE_CODES = new Set(Object.keys(SUPPORTED_LOCALES));
  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;
    const parts = pathname.split("/").filter(Boolean);
    let basePath = pathname;
    if (parts.length > 0 && VALID_LOCALE_CODES.has(parts[0])) {
      basePath = "/" + parts.slice(1).join("/") || "/";
    }
    setLocale(newLocale);
    if (newLocale === "en") {
      navigate(basePath);
    } else {
      navigate(`/${newLocale}${basePath === "/" ? "" : basePath}`);
    }
  };

  const { data: dbMenuData } = useQuery({
    queryKey: ["menu-header-with-id"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menus")
        .select("id, items")
        .eq("location", "header")
        .maybeSingle();
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        return { id: data.id, items: data.items as unknown as MenuItem[] };
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const menuId = dbMenuData?.id;
  const { data: menuTranslations } = useQuery({
    queryKey: ["menu-translations", menuId, locale],
    queryFn: async () => {
      const { data } = await supabase
        .from("translations")
        .select("field_name, translated_text")
        .eq("entity_type", "menu")
        .eq("entity_id", menuId!)
        .eq("locale", locale);
      const map: Record<string, string> = {};
      data?.forEach((row: any) => { map[row.field_name] = row.translated_text; });
      return map;
    },
    enabled: !!menuId && locale !== "vi",
    staleTime: 5 * 60 * 1000,
  });

  const filterByModule = (items: MenuItem[]) =>
    items.filter((item) => {
      const moduleId = URL_MODULE_MAP[item.url];
      if (moduleId === undefined || moduleId === "") return true;
      return isEnabled(moduleId);
    });

  // Use DB nav or defaults
  const rawNavItems = dbMenuData?.items ?? defaultNavItems;
  const navItems = filterByModule(rawNavItems).map((item, i) => ({
    ...item,
    label: menuTranslations?.[`item_${i}_label`] || item.label,
  }));

  // For "More" dropdown, filter by module too
  const filteredMoreItems = filterByModule(moreNavItems);

  const toggleTheme = () => {
    const next: Theme = isDark ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  };

  const isActive = (url: string) => {
    const clean = pathname.replace(/^\/[a-z]{2}(?=\/)/, "");
    return clean === url || clean.startsWith(url + "/");
  };

  const renderNavLink = (item: MenuItem, onClick?: () => void) => {
    const isExternal = item.url.startsWith("http");
    const active = isActive(item.url);
    const cls = `text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
      active
        ? "text-primary bg-primary/8"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    }`;

    if (isExternal || item.open_new_tab) {
      return (
        <a key={item.label + item.url} href={item.url} target="_blank" rel="noopener noreferrer"
          className={cls} onClick={onClick}>
          {item.label}
        </a>
      );
    }
    return (
      <Link key={item.label + item.url} to={item.url} className={cls} onClick={onClick}>
        {item.label}
      </Link>
    );
  };

  const currentLocale = SUPPORTED_LOCALES[locale];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-sm">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gradient">
              ToolScope
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => renderNavLink(item))}

            {/* More dropdown */}
            {filteredMoreItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200">
                    More
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {filteredMoreItems.map((item) => (
                    <DropdownMenuItem key={item.url} onClick={() => navigate(item.url)} className="cursor-pointer">
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-2">
          <CommandPalette />

          {user && <NotificationDropdown />}

          <Button
            variant="ghost" size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="h-9 w-9 rounded-lg"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:flex gap-1.5 text-xs font-medium h-9 rounded-lg">
                <Globe className="h-3.5 w-3.5" />
                {locale.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
              {(Object.entries(SUPPORTED_LOCALES) as [Locale, typeof currentLocale][]).map(([code, meta]) => (
                <DropdownMenuItem key={code} onClick={() => handleLocaleChange(code)} className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{meta.flag}</span>
                    <span className="text-sm">{meta.nativeName}</span>
                  </span>
                  {locale === code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> {t("header.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <Bookmark className="mr-2 h-4 w-4" /> {t("header.saved")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdminOrEditor && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" /> {t("header.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> {t("header.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="rounded-full px-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-sm h-9"
            >
              {t("header.login")}
            </Button>
          )}

          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background p-4 md:hidden animate-slide-down">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
            {filteredMoreItems.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
            <div className="my-2 h-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground w-fit px-3 py-1.5">
                  <Globe className="h-4 w-4" />
                  <span>{currentLocale.flag} {currentLocale.nativeName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto">
                {(Object.entries(SUPPORTED_LOCALES) as [Locale, typeof currentLocale][]).map(([code, meta]) => (
                  <DropdownMenuItem key={code} onClick={() => { handleLocaleChange(code); setMobileMenuOpen(false); }} className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-base">{meta.flag}</span>
                      <span className="text-sm">{meta.nativeName}</span>
                    </span>
                    {locale === code && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {user && (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground px-3 py-1.5">
                  <Bookmark className="h-4 w-4" /> {t("header.saved")}
                </Link>
                {isAdminOrEditor && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground px-3 py-1.5">
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
