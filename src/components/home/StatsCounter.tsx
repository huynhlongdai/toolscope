import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

function roundUp(n: number) {
  if (n >= 10000) return Math.floor(n / 1000) + "K+";
  if (n >= 1000) return Math.floor(n / 100) * 100 + "+";
  if (n >= 100) return Math.floor(n / 10) * 10 + "+";
  return String(n);
}

export function StatsCounter() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [tools, reviews, categories, profiles] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { tools: tools.count ?? 0, reviews: reviews.count ?? 0, categories: categories.count ?? 0, users: profiles.count ?? 0 };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!data) return null;

  const stats = [
    { value: roundUp(data.tools), label: t("stats.tools"), color: "text-indigo-600 dark:text-indigo-400" },
    { value: roundUp(data.categories), label: t("stats.categories"), color: "text-coral-600 dark:text-coral-400" },
    { value: roundUp(data.reviews), label: t("stats.reviews"), color: "text-emerald-600 dark:text-emerald-400" },
    { value: roundUp(data.users), label: t("stats.users"), color: "text-indigo-600 dark:text-indigo-400" },
  ];

  return (
    <section className="py-10 md:py-14 border-y border-border/40" aria-label={t("stats.tools")}>
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 text-center">
              <span className={`text-3xl font-extrabold md:text-4xl tracking-tight ${s.color}`}>
                {s.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
