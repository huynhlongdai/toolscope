import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tool counts per category
  const { data: toolCounts = {} } = useQuery({
    queryKey: ["category-tool-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("category_id")
        .eq("status", "published");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        if (t.category_id) counts[t.category_id] = (counts[t.category_id] || 0) + 1;
      });
      return counts;
    },
  });

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const iconMap: Record<string, string> = {
    "image": "🎨", "code": "💻", "pen-tool": "✏️", "megaphone": "📣",
    "bar-chart": "📊", "briefcase": "💼", "brain": "🧠", "database": "🗄️",
    "music": "🎵", "video": "🎬", "mail": "📧", "shield": "🛡️",
    "zap": "⚡", "globe": "🌐", "users": "👥", "settings": "⚙️",
  };

  const getIcon = (icon: string | null) => {
    if (!icon) return "📁";
    return iconMap[icon] || icon;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead
        title="Danh mục công cụ AI | ToolScope"
        description="Khám phá tất cả danh mục công cụ AI trên ToolScope — từ thiết kế, lập trình, marketing đến phân tích dữ liệu."
      />
      <Header />
      <main className="flex-1">
        <div className="container py-10">
          {/* Hero */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Danh mục công cụ AI
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
              Khám phá {categories.length}+ danh mục công cụ AI được phân loại chi tiết, giúp bạn tìm đúng công cụ cho nhu cầu của mình.
            </p>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {parentCategories.map((cat) => {
                const children = getChildren(cat.id);
                const count = (toolCounts[cat.id] || 0) + children.reduce((s, c) => s + (toolCounts[c.id] || 0), 0);

                return (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                  >
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="text-3xl">{getIcon(cat.icon)}</span>
                        <div>
                          <h2 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                            {cat.name}
                          </h2>
                          <Badge variant="secondary" className="mt-1 text-xs font-normal">
                            {count} công cụ
                          </Badge>
                        </div>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                      )}
                    </div>

                    {children.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {children.slice(0, 3).map((child) => (
                          <span key={child.id} className="text-xs rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {child.name}
                          </span>
                        ))}
                        {children.length > 3 && (
                          <span className="text-xs rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            +{children.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
