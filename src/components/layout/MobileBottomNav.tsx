import { Link, useLocation } from "react-router-dom";
import { Home, Search, User, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const navItems = [
  { icon: Home, label: "Trang chủ", path: "/" },
  { icon: Search, label: "Khám phá", path: "/tools" },
  { icon: TrendingUp, label: "Trending", path: "/trending" },
  { icon: User, label: "Tài khoản", path: "/profile" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          const actualPath = path === "/profile" && !user ? "/auth" : path;

          return (
            <Link
              key={path}
              to={actualPath}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
