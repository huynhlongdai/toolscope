import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Danh mục công cụ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Khám phá theo lĩnh vực bạn quan tâm</p>
          </div>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
            Xem tất cả →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5 text-center transition-all hover:border-primary/20 hover:shadow-md"
              >
                <span className="text-2xl transition-transform group-hover:scale-110">
                  {cat.icon || defaultIcon}
                </span>
                <span className="text-xs font-medium leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
