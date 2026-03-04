import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";

interface Tool {
  id: string;
  name: string;
  slug: string;
  avg_rating: number | null;
  view_count: number;
  rating_count: number;
}

interface Props {
  tools: Tool[];
  categoryName: string;
}

export function G2GridChart({ tools, categoryName }: Props) {
  const navigate = useNavigate();

  // Need at least 3 tools with ratings
  const validTools = tools.filter((t) => t.avg_rating && Number(t.avg_rating) > 0 && t.rating_count > 0);
  if (validTools.length < 3) return null;

  // Normalize market presence (view_count + rating_count) to 0-100
  const maxPresence = Math.max(...validTools.map((t) => t.view_count + t.rating_count * 10));

  const data = validTools.map((t) => ({
    name: t.name,
    slug: t.slug,
    satisfaction: Number(t.avg_rating) * 20, // 1-5 → 0-100
    presence: maxPresence > 0 ? ((t.view_count + t.rating_count * 10) / maxPresence) * 100 : 50,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover text-popover-foreground border rounded-lg p-2 shadow-lg text-xs">
        <p className="font-medium">{d.name}</p>
        <p>Satisfaction: {d.satisfaction.toFixed(0)}%</p>
        <p>Market Presence: {d.presence.toFixed(0)}%</p>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> G2 Grid — {categoryName}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Satisfaction vs Market Presence</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" dataKey="presence" domain={[0, 100]} tickCount={5}
              className="text-xs fill-muted-foreground">
              <Label value="Market Presence →" offset={-10} position="insideBottom" className="fill-muted-foreground text-xs" />
            </XAxis>
            <YAxis type="number" dataKey="satisfaction" domain={[0, 100]} tickCount={5}
              className="text-xs fill-muted-foreground">
              <Label value="Satisfaction →" angle={-90} position="insideLeft" className="fill-muted-foreground text-xs" />
            </YAxis>
            <ReferenceLine x={50} className="stroke-border" strokeDasharray="3 3" />
            <ReferenceLine y={50} className="stroke-border" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              className="fill-primary"
              cursor="pointer"
              onClick={(entry: any) => navigate(`/tool/${entry.slug}`)}
            />
            {/* Quadrant Labels */}
            <text x="25%" y="15%" textAnchor="middle" className="fill-muted-foreground/40 text-[10px]">High Performers</text>
            <text x="75%" y="15%" textAnchor="middle" className="fill-muted-foreground/40 text-[10px]">Leaders</text>
            <text x="25%" y="95%" textAnchor="middle" className="fill-muted-foreground/40 text-[10px]">Niche</text>
            <text x="75%" y="95%" textAnchor="middle" className="fill-muted-foreground/40 text-[10px]">Contenders</text>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
