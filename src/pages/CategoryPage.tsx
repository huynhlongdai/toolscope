import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: tools, isLoading } = useQuery({
    queryKey: ["category-tools", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .eq("category_id", category!.id)
        .order("avg_rating", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {category?.name || "Đang tải..."}
            </h1>
            {category?.description && (
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : tools && tools.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{tools.length} công cụ</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    id={tool.id}
                    name={tool.name}
                    slug={tool.slug}
                    shortDescription={tool.short_description || undefined}
                    logoUrl={tool.logo_url || undefined}
                    websiteUrl={tool.website_url || undefined}
                    pricingType={tool.pricing_type}
                    avgRating={Number(tool.avg_rating) || 0}
                    ratingCount={tool.rating_count}
                    categoryName={(tool.categories as any)?.name}
                    isTrending={tool.is_trending}
                    isAiRecommended={(tool.ai_scores as any)?.is_recommended}
                    aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <p className="text-muted-foreground">Chưa có công cụ nào trong danh mục này</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
