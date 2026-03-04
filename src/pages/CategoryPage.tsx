import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SEOHead } from "@/components/seo/SEOHead";
import { Home } from "lucide-react";

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

  // Fetch parent category if exists
  const { data: parentCategory } = useQuery({
    queryKey: ["parent-category", category?.parent_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name, slug").eq("id", category!.parent_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!category?.parent_id,
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

  // JSON-LD BreadcrumbList
  const breadcrumbJsonLd = category ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: window.location.origin + "/" },
      { "@type": "ListItem", position: 2, name: "Danh mục", item: window.location.origin + "/categories" },
      ...(parentCategory ? [{ "@type": "ListItem", position: 3, name: parentCategory.name, item: window.location.origin + "/category/" + parentCategory.slug }] : []),
      { "@type": "ListItem", position: parentCategory ? 4 : 3, name: category.name },
    ],
  } : null;

  return (
    <div className="flex min-h-screen flex-col">
      {category && (
        <SEOHead
          title={`${category.name} — Công cụ AI tốt nhất | ToolScope`}
          description={category.description || `Khám phá các công cụ AI hàng đầu trong danh mục ${category.name} trên ToolScope.`}
        />
      )}
      {breadcrumbJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      )}
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    Trang chủ
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/categories">Danh mục</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {parentCategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/category/${parentCategory.slug}`}>{parentCategory.name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category?.name || "..."}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

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
