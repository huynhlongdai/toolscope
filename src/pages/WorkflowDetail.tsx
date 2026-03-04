import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, ThumbsUp, Workflow, CheckCircle2 } from "lucide-react";

export default function WorkflowDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: wf, isLoading } = useQuery({
    queryKey: ["workflow", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*, profiles(display_name, avatar_url)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        supabase.from("workflows").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", data.id).then();
      }
      return data;
    },
    enabled: !!slug,
  });

  const toolIds = (wf?.tool_ids as string[]) ?? [];
  const { data: tools = [] } = useQuery({
    queryKey: ["workflow-tools", toolIds],
    queryFn: async () => {
      if (!toolIds.length) return [];
      const { data } = await supabase.from("tools").select("*, categories(name)").in("id", toolIds);
      return data ?? [];
    },
    enabled: toolIds.length > 0,
  });

  const steps = (wf?.steps as any[]) ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container max-w-3xl py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 rounded-xl mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-xl text-muted-foreground">Không tìm thấy workflow</p>
          <Link to="/workflows" className="mt-4 inline-block text-primary hover:underline">← Quay lại Workflows</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title={`${wf.title} - ToolScope Workflow`} description={wf.description || `Workflow: ${wf.title}`} />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <article className="container max-w-3xl py-8">
          <Link to="/workflows" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Workflows
          </Link>

          {wf.cover_image_url && (
            <div className="mb-6 aspect-video overflow-hidden rounded-xl">
              <img src={wf.cover_image_url} alt={wf.title} className="h-full w-full object-cover" />
            </div>
          )}

          <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {wf.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {wf.category && <Badge variant="secondary">{wf.category}</Badge>}
            <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" /> {wf.upvotes ?? 0}</span>
            <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {wf.view_count ?? 0} lượt xem</span>
            {(wf.profiles as any)?.display_name && (
              <span>bởi {(wf.profiles as any).display_name}</span>
            )}
          </div>

          {wf.description && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{wf.description}</p>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Các bước thực hiện
              </h2>
              <div className="relative space-y-0">
                {steps.map((step: any, i: number) => {
                  const stepTool = step.tool_id ? tools.find((t: any) => t.id === step.tool_id) : null;
                  return (
                    <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {i < steps.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
                      )}
                      {/* Step number */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm z-10">
                        {i + 1}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                        {step.description && (
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        )}
                        {stepTool && (
                          <div className="mt-3">
                            <ToolCard
                              id={stepTool.id}
                              name={stepTool.name}
                              slug={stepTool.slug}
                              shortDescription={stepTool.short_description}
                              logoUrl={stepTool.logo_url}
                              websiteUrl={stepTool.website_url}
                              pricingType={stepTool.pricing_type}
                              avgRating={stepTool.avg_rating ?? 0}
                              ratingCount={stepTool.rating_count ?? 0}
                              categoryName={stepTool.categories?.name}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All related tools */}
          {tools.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold mb-4">🔗 Tools trong Workflow này</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {tools.map((t: any) => (
                  <ToolCard
                    key={t.id}
                    id={t.id}
                    name={t.name}
                    slug={t.slug}
                    shortDescription={t.short_description}
                    logoUrl={t.logo_url}
                    websiteUrl={t.website_url}
                    pricingType={t.pricing_type}
                    avgRating={t.avg_rating ?? 0}
                    ratingCount={t.rating_count ?? 0}
                    categoryName={t.categories?.name}
                  />
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
