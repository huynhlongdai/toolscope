import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Moon, Sun, Menu, X, Bookmark, User, LogOut, Layers, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useI18n } from "@/lib/i18n";
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
  { label: "Ưu đãi", url: "/deals" },
  { label: "Blog", url: "/blog" },
];

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdminOrEditor } = useAdminAuth();
  const { locale, setLocale } = useI18n();
  const navigate = useNavigate();

  const { data: dbMenuItems } = useQuery({
    queryKey: ["menu-header"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menus")
        .select("items")
        .eq("location", "header")
        .maybeSingle();
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        return data.items as unknown as MenuItem[];
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const navItems = dbMenuItems ?? defaultNavItems;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const renderLink = (item: MenuItem, onClick?: () => void) => {
    const isExternal = item.url.startsWith("http");
    if (isExternal || item.open_new_tab) {
      return (
        <a
          key={item.label}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={onClick}
        >
          {item.label}
        </a>
      );
    }
    return (
      <Link
        key={item.label}
        to={item.url}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={onClick}
      >
        {item.label}
      </Link>
    );
  };

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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="hidden md:flex gap-1 text-xs font-medium"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "vi" ? "EN" : "VI"}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" /> {t("header.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Bookmark className="mr-2 h-4 w-4" /> {t("header.saved")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdminOrEditor && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> {t("header.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("header.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>
              Đăng nhập
            </Button>
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
            <button
              onClick={() => {
                setLocale(locale === "vi" ? "en" : "vi");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              {locale === "vi" ? "English" : "Tiếng Việt"}
            </button>
            {user && (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Bookmark className="h-4 w-4" />
                  Đã lưu & Collections
                </Link>
                {isAdminOrEditor && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
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
