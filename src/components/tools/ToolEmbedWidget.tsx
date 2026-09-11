import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ToolCard } from "./ToolCard";

/**
 * Embeddable tool-card widget, used by ShortcodeContent.
 * Usage inside a blog post / page body: [tool:slug]
 * Looks up ONE published tool by slug and renders it as a compact ToolCard
 * so writers can recommend/link a tool inline without leaving the editor.
 */
export function ToolEmbedWidget({ slug }: { slug: string }) {
  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool-embed-widget", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url, website_url, pricing_type, avg_rating, rating_count, has_free_trial, trial_days, requires_card, created_at, categories(name)")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="my-4 h-24 animate-pulse rounded-xl bg-muted not-prose" />;
  }

  if (!tool) return null;

  return (
    <div className="my-4 not-prose">
      <ToolCard
        id={tool.id}
        name={tool.name}
        slug={tool.slug}
        shortDescription={tool.short_description ?? undefined}
        logoUrl={tool.logo_url ?? undefined}
        websiteUrl={tool.website_url ?? undefined}
        pricingType={tool.pricing_type}
        avgRating={tool.avg_rating ?? 0}
        ratingCount={tool.rating_count ?? 0}
        categoryName={(tool as any).categories?.name}
        hasFreeTrial={tool.has_free_trial ?? undefined}
        trialDays={tool.trial_days ?? undefined}
        requiresCard={tool.requires_card ?? undefined}
        createdAt={tool.created_at ?? undefined}
        variant="list"
      />
    </div>
  );
}
