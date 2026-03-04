import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const timer = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  const suggestions = [
    { label: "Trang chủ", href: "/", icon: Home },
    { label: "Khám phá công cụ", href: "/tools", icon: Search },
    { label: "Danh mục", href: "/categories", icon: Compass },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          {/* Animated 404 */}
          <div className="relative mb-8 select-none">
            <h1
              className={`text-[10rem] font-black leading-none tracking-tighter transition-all duration-100 ${
                glitch ? "text-destructive skew-x-2" : "text-foreground/10"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border bg-card/80 px-6 py-4 shadow-xl backdrop-blur-sm">
                <p className="text-xl font-semibold text-foreground">
                  Trang không tồn tại
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Đường dẫn <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">{location.pathname}</code> không được tìm thấy
                </p>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <p className="mb-6 text-muted-foreground">
            Có thể trang đã bị xóa, đổi tên hoặc không tồn tại. Hãy thử:
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {suggestions.map(({ label, href, icon: Icon }) => (
              <Button key={href} variant="outline" asChild className="gap-2 w-full sm:w-auto">
                <Link to={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="mt-6">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang trước
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
