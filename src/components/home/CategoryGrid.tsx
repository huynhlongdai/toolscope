import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Pastel gradient backgrounds for category cards
const CARD_COLORS = [
  "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
  "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
  "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
  "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
  "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
  "from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30",
  "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
  "from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/30 dark:to-pink-950/30",
];

export function CategoryGrid() {
  const { t } = useI18n();
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

  return (
    <section className="py-10 md:py-14" aria-label={t("categories.title")}>
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl tracking-tight">
              {t("categories.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore {categories.length}+ carefully organized categories
            </p>
          </div>
          <Link to="/categories" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {t("categories.all")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-44 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((cat, i) => {
              const count = (cat as any).tools?.[0]?.count ?? 0;
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className={`group flex flex-col justify-between min-w-[160px] md:min-w-[180px] rounded-xl p-5 bg-gradient-to-br ${CARD_COLORS[i % CARD_COLORS.length]} border border-border/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}
                >
                  <span className="text-3xl mb-3">{cat.icon || defaultIcon}</span>
                  <div>
                    <span className="font-semibold text-sm text-foreground">{cat.name}</span>
                    {count > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{count} tools</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
