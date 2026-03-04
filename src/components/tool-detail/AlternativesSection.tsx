import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolCard } from "@/components/tools/ToolCard";
import { ArrowRightLeft } from "lucide-react";

interface Props {
  toolId: string;
  toolName: string;
  categoryId?: string | null;
}

export function AlternativesSection({ toolId, toolName, categoryId }: Props) {
  // Fetch from tool_alternatives table first
  const { data: directAlts } = useQuery({
    queryKey: ["tool-alternatives-direct", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_alternatives" as any)
        .select("alternative_id, vote_count")
        .eq("tool_id", toolId)
        .order("vote_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch alternative tool details
  const altIds = directAlts?.map((a: any) => a.alternative_id) || [];

  // Fallback: same category tools
  const { data: alternatives } = useQuery({
    queryKey: ["alternatives-full", toolId, categoryId, altIds],
    queryFn: async () => {
      if (altIds.length > 0) {
        const { data, error } = await supabase
          .from("tools")
          .select("*, categories(name), ai_scores(overall_score, is_recommended)")
          .eq("status", "published")
          .in("id", altIds)
          .limit(6);
        if (error) throw error;
        return data;
      }
      // Fallback to same category
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .eq("category_id", categoryId)
        .neq("id", toolId)
        .order("avg_rating", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: directAlts !== undefined,
  });

  if (!alternatives || alternatives.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Alternatives cho {toolName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alternatives.map((alt) => (
          <ToolCard
            key={alt.id}
            id={alt.id}
            name={alt.name}
            slug={alt.slug}
            shortDescription={alt.short_description || undefined}
            logoUrl={alt.logo_url || undefined}
            websiteUrl={alt.website_url || undefined}
            pricingType={alt.pricing_type}
            avgRating={Number(alt.avg_rating) || 0}
            ratingCount={alt.rating_count}
            categoryName={(alt.categories as any)?.name}
            isAiRecommended={(alt.ai_scores as any)?.is_recommended}
            aiScore={(alt.ai_scores as any)?.overall_score ? Number((alt.ai_scores as any).overall_score) : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
}
