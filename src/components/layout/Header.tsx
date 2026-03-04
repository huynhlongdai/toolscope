import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Moon, Sun, Menu, X, Bookmark, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
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
            <Link to="/tools" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Khám phá
            </Link>
            <Link to="/categories" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Danh mục
            </Link>
            <Link to="/compare" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              So sánh
            </Link>
            <Link to="/trending" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Trending
            </Link>
            <Link to="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Blog
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tools")} className="hidden md:flex">
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Bookmark trang này (Ctrl+D)"
            onClick={() => {
              // Trigger browser bookmark dialog
              if ((window as any).sidebar?.addPanel) {
                (window as any).sidebar.addPanel(document.title, window.location.href, '');
              } else if ((window as any).external?.AddFavorite) {
                (window as any).external.AddFavorite(window.location.href, document.title);
              } else {
                // Modern browsers - prompt user with keyboard shortcut
                alert(`Nhấn ${navigator.userAgent.includes('Mac') ? '⌘+D' : 'Ctrl+D'} để bookmark trang này!`);
              }
            }}
          >
            <Bookmark className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
                  <User className="mr-2 h-4 w-4" /> Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/bookmarks")}>
                  <Bookmark className="mr-2 h-4 w-4" /> Đã lưu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
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
          <nav className="flex flex-col gap-3">
            <Link to="/tools" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Khám phá</Link>
            <Link to="/categories" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Danh mục</Link>
            <Link to="/compare" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>So sánh</Link>
            <Link to="/trending" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Trending</Link>
            <Link to="/blog" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
