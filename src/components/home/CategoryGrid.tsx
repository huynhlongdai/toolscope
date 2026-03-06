import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

export function CategoryGrid() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, tools(count)")
        .is("parent_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const defaultIcon = "📁";
  const visibleCategories = categories.slice(0, 8);

  return (
    <section className="py-8 md:py-12" aria-label="Danh mục công cụ">
      <div className="container">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold md:text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Danh mục công cụ
          </h2>
          <Link
            to="/categories"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tất cả <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (
          <nav role="navigation" aria-label="Danh mục">
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:hidden -mx-4 px-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  <span>{cat.icon || defaultIcon}</span>
                  <span>{cat.name}</span>
                  {(cat as any).tools?.[0]?.count > 0 && (
                    <span className="text-[10px] text-muted-foreground">({(cat as any).tools[0].count})</span>
                  )}
                </Link>
              ))}
            </div>
            {/* Desktop: compact wrap */}
            <div className="hidden md:flex md:flex-wrap md:gap-2">
              {visibleCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
                >
                  <span className="text-sm">{cat.icon || defaultIcon}</span>
                  <span>{cat.name}</span>
                  {(cat as any).tools?.[0]?.count > 0 && (
                    <span className="text-[10px] text-muted-foreground">({(cat as any).tools[0].count})</span>
                  )}
                </Link>
              ))}
              {categories.length > 8 && (
                <Link
                  to="/categories"
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  +{categories.length - 8} khác
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}