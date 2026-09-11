import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "./DealCard";

/**
 * Embeddable deals widget, used in ShortcodeContent (Blog/Page/Tool detail).
 *
 * Two lookup modes:
 * - `toolId` (+ optional `couponCode`): shows deals for a specific tool.
 *   Usage: [deals] / [deal] inside a Tool detail article (toolId is implicit).
 * - `dealSlug`: looks up ONE specific deal directly by its own `slug` column,
 *   regardless of which tool it belongs to. This is what powers `[deal:slug]`
 *   shortcodes typed inside a blog post / page that isn't tied to one tool.
 */
export function DealsWidget({
  toolId,
  couponCode,
  dealSlug,
}: {
  toolId?: string;
  couponCode?: string;
  dealSlug?: string;
}) {
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-widget", toolId, couponCode, dealSlug],
    queryFn: async () => {
      if (dealSlug) {
        // Direct lookup by the deal's own slug - not tied to a specific tool.
        const { data, error } = await (supabase.from("deals") as any)
          .select("*, tools(name, slug, logo_url)")
          .eq("slug", dealSlug)
          .maybeSingle();
        if (error) throw error;
        if (!data || !data.is_active) return [];
        if (data.expires_at && new Date(data.expires_at) <= new Date()) return [];
        return [data];
      }

      let q = supabase
        .from("deals")
        .select("*, tools(name, slug, logo_url)")
        .eq("tool_id", toolId as string)
        .eq("is_active", true);

      if (couponCode) {
        q = q.eq("coupon_code", couponCode);
      }

      const { data, error } = await q
        .order("is_exclusive", { ascending: false })
        .order("discount_value", { ascending: false })
        .limit(couponCode ? 1 : 5);

      if (error) throw error;
      return (data ?? []).filter((d: any) => !d.expires_at || new Date(d.expires_at) > new Date());
    },
    enabled: !!dealSlug || !!toolId,
  });

  if (deals.length === 0) return null;

  return (
    <div className="my-4 space-y-3 not-prose">
      <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
        🏷️ Ưu đãi đặc biệt
      </p>
      {deals.map((deal: any) => (
        <DealCard
          key={deal.id}
          deal={deal}
          toolName={deal.tools?.name}
          toolSlug={deal.tools?.slug}
          toolLogoUrl={deal.tools?.logo_url}
        />
      ))}
    </div>
  );
}
