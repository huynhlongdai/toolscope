import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, MessageSquare, Grid3X3, Users } from "lucide-react";

function roundUp(n: number) {
  if (n >= 10000) return Math.floor(n / 1000) + "K+";
  if (n >= 1000) return Math.floor(n / 100) * 100 + "+";
  if (n >= 100) return Math.floor(n / 10) * 10 + "+";
  return String(n);
}

export function StatsCounter() {
  const { data } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [tools, reviews, categories, profiles] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        tools: tools.count ?? 0,
        reviews: reviews.count ?? 0,
        categories: categories.count ?? 0,
        users: profiles.count ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!data) return null;

  const stats = [
    { icon: Wrench, value: roundUp(data.tools), label: "Công cụ" },
    { icon: MessageSquare, value: roundUp(data.reviews), label: "Đánh giá" },
    { icon: Grid3X3, value: roundUp(data.categories), label: "Danh mục" },
    { icon: Users, value: roundUp(data.users), label: "Người dùng" },
  ];

  return (
    <section className="py-8 md:py-10 bg-primary/5" aria-label="Thống kê nền tảng">
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-center">
              <s.icon className="h-6 w-6 text-primary" />
              <span className="text-2xl font-bold md:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
