import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "./DealCard";

/**
 * Embeddable deals widget, used in DetailedArticle shortcodes
 * Usage: [deals] for current tool, [deal:COUPON_CODE] for specific deal
 */
export function DealsWidget({ toolId, couponCode }: { toolId: string; couponCode?: string }) {
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-widget", toolId, couponCode],
    queryFn: async () => {
      let q = supabase
        .from("deals")
        .select("*")
        .eq("tool_id", toolId)
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
    enabled: !!toolId,
  });

  if (deals.length === 0) return null;

  return (
    <div className="my-4 space-y-3 not-prose">
      <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
        🏷️ Ưu đãi đặc biệt
      </p>
      {deals.map((deal: any) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
