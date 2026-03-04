import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "./DealCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";

export function DealsSection({ toolId, toolName }: { toolId: string; toolName: string }) {
  const { data: deals = [] } = useQuery({
    queryKey: ["tool-deals", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tool_id", toolId)
        .eq("is_active", true)
        .order("is_exclusive", { ascending: false })
        .order("discount_value", { ascending: false });
      if (error) throw error;
      // Filter expired deals client-side
      return (data ?? []).filter((d: any) => !d.expires_at || new Date(d.expires_at) > new Date());
    },
    enabled: !!toolId,
  });

  if (deals.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Ưu đãi ({deals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deals.map((deal: any) => (
          <DealCard key={deal.id} deal={deal} toolName={toolName} />
        ))}
      </CardContent>
    </Card>
  );
}
