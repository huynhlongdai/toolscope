import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface PricingHistoryChartProps {
  toolId: string;
  toolName: string;
}

export function PricingHistoryChart({ toolId, toolName }: PricingHistoryChartProps) {
  const { data: history } = useQuery({
    queryKey: ["pricing-history", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_history")
        .select("*")
        .eq("tool_id", toolId)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const hasChartData = history && history.some(h => h.price_amount != null && Number(h.price_amount) > 0);

  const chartData = (history ?? []).map((h) => ({
    date: format(new Date(h.recorded_at), "dd/MM"),
    price: h.price_amount ? Number(h.price_amount) : 0,
    plan: h.plan_name || h.pricing_type,
  }));

  return (
    <Card className={!hasChartData ? "border-dashed border-muted-foreground/20" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className={`h-5 w-5 ${hasChartData ? "text-primary" : "text-muted-foreground"}`} />
          Lịch sử giá - {toolName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasChartData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value}`, "Giá"]}
                />
                <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu lịch sử giá</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Giá sẽ được cập nhật định kỳ</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
