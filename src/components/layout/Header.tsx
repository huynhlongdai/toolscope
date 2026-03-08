import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Moon, Sun, Menu, X, Bookmark, User, LogOut, Shield, Globe, Check } from "lucide-react";
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
  { label: "Khám phá", url: "/tools" },
  { label: "Trending", url: "/trending" },
  { label: "Tasks", url: "/tasks" },
  { label: "Launches", url: "/launches" },
  { label: "Workflows", url: "/workflows" },
  { label: "Ưu đãi", url: "/deals" },
  { label: "Blog", url: "/blog" },
];

// URL prefix → module ID mapping for nav filtering
const URL_MODULE_MAP: Record<string, string> = {
  "/tools": "",       // always on
  "/trending": "",    // always on
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
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdminOrEditor } = useAdminAuth();
  const { locale, setLocale, t } = useI18n();
  const { isEnabled } = useModules();
  const navigate = useNavigate();

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

  // Load menu translations for current locale
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

  const rawNavItems = dbMenuData?.items ?? defaultNavItems;

  // Filter nav items by module enabled status
  const filterByModule = (items: MenuItem[]) =>
    items.filter((item) => {
      const moduleId = URL_MODULE_MAP[item.url];
      if (moduleId === undefined || moduleId === "") return true; // unknown or always-on
      return isEnabled(moduleId);
    });

  // Apply translations to menu items
  const navItems = filterByModule(rawNavItems).map((item, i) => ({
    ...item,
    label: menuTranslations?.[`item_${i}_label`] || item.label,
  }));

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const renderLink = (item: MenuItem, onClick?: () => void) => {
    const isExternal = item.url.startsWith("http");
    if (isExternal || item.open_new_tab) {
      return (
        <a key={item.label + item.url} href={item.url} target="_blank" rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={onClick}>
          {item.label}
        </a>
      );
    }
    return (
      <Link key={item.label + item.url} to={item.url}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={onClick}>
        {item.label}
      </Link>
    );
  };

  const currentLocale = SUPPORTED_LOCALES[locale];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ToolScope
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => renderLink(item))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tools")} className="hidden md:flex">
            <Search className="h-4 w-4" />
          </Button>
          {user && <NotificationDropdown />}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:flex gap-1.5 text-xs font-medium">
                <span className="text-base leading-none">{currentLocale.flag}</span>
                {locale.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
              {(Object.entries(SUPPORTED_LOCALES) as [Locale, typeof currentLocale][]).map(([code, meta]) => (
                <DropdownMenuItem key={code} onClick={() => setLocale(code)} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{meta.flag}</span>
                    <span className="text-sm">{meta.nativeName}</span>
                  </span>
                  {locale === code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full"><User className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}><User className="mr-2 h-4 w-4" /> {t("header.profile")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}><Bookmark className="mr-2 h-4 w-4" /> {t("header.saved")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdminOrEditor && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}><Shield className="mr-2 h-4 w-4" /> {t("header.admin")}</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> {t("header.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>{t("header.login")}</Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => renderLink(item, () => setMobileMenuOpen(false)))}
            <div className="my-2 h-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground w-fit">
                  <Globe className="h-4 w-4" />
                  <span>{currentLocale.flag} {currentLocale.nativeName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto">
                {(Object.entries(SUPPORTED_LOCALES) as [Locale, typeof currentLocale][]).map(([code, meta]) => (
                  <DropdownMenuItem key={code} onClick={() => { setLocale(code); setMobileMenuOpen(false); }} className="flex items-center justify-between">
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
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <Bookmark className="h-4 w-4" /> {t("header.saved")}
                </Link>
                {isAdminOrEditor && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
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
