import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export function RecentReviews() {
  const { t } = useI18n();
  const { data: reviews } = useQuery({
    queryKey: ["home-recent-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, title, content, ease_of_use, created_at, profiles(display_name, avatar_url), tools(name, slug, logo_url)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="py-8 md:py-10" aria-label={t("reviews.title")}>
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("reviews.title")}</h2>
          <Link to="/tools" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("reviews.viewMore")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => {
            const tool = r.tools as any;
            const profile = r.profiles as any;
            return (
              <Link key={r.id} to={`/tool/${tool?.slug}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {tool?.logo_url && <img src={tool.logo_url} alt={tool.name} className="h-6 w-6 rounded object-contain" loading="lazy" />}
                      <span className="text-xs font-medium text-primary truncate">{tool?.name}</span>
                    </div>
                    <h3 className="text-sm font-semibold line-clamp-1">{r.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.content}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{profile?.display_name || t("reviews.anonymous")}</span>
                      {r.ease_of_use && (
                        <span className="flex items-center gap-0.5 text-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {r.ease_of_use}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
