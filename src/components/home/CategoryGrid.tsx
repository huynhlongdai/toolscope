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
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const defaultIcon = "📁";
  // Show max 12 on homepage for clean layout
  const visibleCategories = categories.slice(0, 12);

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 md:gap-3">
            {visibleCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
              >
                <span className="text-base">{cat.icon || defaultIcon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
            {categories.length > 12 && (
              <Link
                to="/categories"
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                +{categories.length - 12} khác
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
