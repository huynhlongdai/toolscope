import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitCompareArrows, Plus, X, Star, Check, Minus, Calculator,
  TrendingUp, Users, DollarSign, BarChart3, Clock, Zap, ArrowRightLeft
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line
} from "recharts";
import { format } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

// pricingLabel removed - now uses t() in component

type ToolWithScores = {
  id: string; name: string; slug: string; logo_url: string | null;
  short_description: string | null; description: string | null;
  pricing_type: string; avg_rating: number | null; rating_count: number;
  view_count: number; website_url: string | null; platforms: string[] | null;
  features: any; pricing_details: any;
  categories: { name: string } | null;
  ai_scores: {
    overall_score: number; ease_of_use: number | null; features: number | null;
    value_for_money: number | null; support: number | null; performance: number | null;
    is_recommended: boolean; pros: string[] | null; cons: string[] | null; summary: string | null;
  } | null;
};

function ScoreBar({ score, max = 10 }: { score: number | null; max?: number }) {
  if (score == null) return <span className="text-xs text-muted-foreground">N/A</span>;
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "bg-accent" : pct >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

/* ─── Radar Chart ─── */
function CompareRadarChart({ tools, t }: { tools: ToolWithScores[]; t: (key: string) => string }) {
  const dimensions = [
    { key: "ease_of_use", label: t("compare.easeOfUse") },
    { key: "features", label: t("compare.features") },
    { key: "value_for_money", label: t("compare.value") },
    { key: "performance", label: t("compare.performance") },
    { key: "support", label: t("compare.support") },
  ];

  const data = dimensions.map((d) => {
    const row: any = { dimension: d.label };
    tools.forEach((t) => {
      row[t.name] = Number((t.ai_scores as any)?.[d.key]) || 0;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" /> {t("compare.radarTitle")}
        </CardTitle>
        <CardDescription>{t("compare.radarDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
              {tools.map((t, i) => (
                <Radar
                  key={t.id}
                  name={t.name}
                  dataKey={t.name}
                  stroke={CHART_COLORS[i]}
                  fill={CHART_COLORS[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Bar Chart Score Comparison ─── */
function CompareBarChart({ tools, t }: { tools: ToolWithScores[]; t: (key: string) => string }) {
  const data = tools.map((t_) => ({
    name: t_.name,
    "AI Score": Number(t_.ai_scores?.overall_score) || 0,
    "Rating": Number(t_.avg_rating || 0) * 2,
    [t("compare.views")]: Math.min(t_.view_count / 100, 10),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-accent" /> {t("compare.overviewTitle")}
        </CardTitle>
        <CardDescription>AI Score, Rating (×2) & Popularity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="AI Score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rating" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t("compare.views")} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Pricing Trend Comparison ─── */
function PricingTrendChart({ toolIds, tools, t }: { toolIds: string[]; tools: ToolWithScores[]; t: (key: string) => string }) {
  const { data: allHistory } = useQuery({
    queryKey: ["pricing-history-compare", toolIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_history")
        .select("*")
        .in("tool_id", toolIds)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: toolIds.length > 0,
  });

  if (!allHistory || allHistory.length === 0) return null;

  // Build unified timeline
  const dateMap = new Map<string, any>();
  allHistory.forEach((h) => {
    const dateKey = format(new Date(h.recorded_at), "MM/yyyy");
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey });
    const toolName = tools.find((t) => t.id === h.tool_id)?.name || "Unknown";
    dateMap.get(dateKey)![toolName] = Number(h.price_amount) || 0;
  });
  const chartData = Array.from(dateMap.values());

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" /> {t("compare.priceTrendTitle")}
        </CardTitle>
        <CardDescription>{t("compare.priceTrendDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }} formatter={(value: number) => [`$${value}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {tools.map((t, i) => (
                <Line key={t.id} type="monotone" dataKey={t.name} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── ROI Calculator ─── */
function ROICalculator({ tools, t }: { tools: ToolWithScores[]; t: (key: string) => string }) {
  const [teamSize, setTeamSize] = useState(10);
  const [months, setMonths] = useState(12);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" /> {t("compare.roiTitle")}
        </CardTitle>
        <CardDescription>{t("compare.roiDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Team:</label>
            <Input type="number" min={1} max={1000} value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value) || 1)} className="h-8 w-20" />
            <span className="text-xs text-muted-foreground">{t("compare.teamLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Time:</label>
            <Input type="number" min={1} max={60} value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 1)} className="h-8 w-20" />
            <span className="text-xs text-muted-foreground">{t("compare.timeLabel")}</span>
          </div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(tools.length, 4)}, 1fr)` }}>
          {tools.map((tool, i) => {
            const pricing = tool.pricing_details as any;
            const monthlyPerUser = pricing?.monthly_price || (tool.pricing_type === "free" ? 0 : null);
            const monthlyCost = monthlyPerUser != null ? monthlyPerUser * teamSize : null;
            const totalCost = monthlyCost != null ? monthlyCost * months : null;
            const dailyCost = monthlyCost != null ? monthlyCost / 30 : null;

            return (
              <div key={tool.id} className="rounded-lg border border-border p-4 text-center" style={{ borderColor: CHART_COLORS[i] }}>
                <p className="text-sm font-semibold mb-3">{tool.name}</p>
                {monthlyCost != null ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-3xl font-bold text-primary">${totalCost!.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{t("compare.totalMonths")} {months} {t("compare.timeLabel")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-sm font-semibold">${monthlyCost.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{t("compare.perMonth")}</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="text-sm font-semibold">${dailyCost!.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">{t("compare.perDay")}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">${monthlyPerUser}/user{t("compare.perMonth")}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    {tool.pricing_type === "free" ? "🎉 Miễn phí" : "Liên hệ để báo giá"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Switching Cost Calculator ─── */
function SwitchingCostCalculator({ tools }: { tools: ToolWithScores[] }) {
  const [currentToolIdx, setCurrentToolIdx] = useState(0);
  const [teamSize, setTeamSize] = useState(10);
  const [hoursToMigrate, setHoursToMigrate] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(30);

  const migrationCost = teamSize * hoursToMigrate * hourlyRate;
  const productivityLossDays = Math.ceil(hoursToMigrate / 2);
  const productivityLossCost = teamSize * productivityLossDays * hourlyRate * 2;
  const totalSwitchingCost = migrationCost + productivityLossCost;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRightLeft className="h-5 w-5 text-accent" /> Chi phí chuyển đổi (Switching Cost)
        </CardTitle>
        <CardDescription>Ước tính chi phí khi chuyển từ tool này sang tool khác</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Team size</label>
            <Input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value) || 1)} className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Giờ migration/người</label>
            <Input type="number" min={1} value={hoursToMigrate} onChange={(e) => setHoursToMigrate(Number(e.target.value) || 1)} className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chi phí/giờ (USD)</label>
            <Input type="number" min={1} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value) || 1)} className="h-8" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chuyển từ</label>
            <select
              value={currentToolIdx}
              onChange={(e) => setCurrentToolIdx(Number(e.target.value))}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {tools.map((t, i) => (
                <option key={t.id} value={i}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Chi phí migration</p>
            <p className="text-xl font-bold text-foreground">${migrationCost.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{teamSize} người × {hoursToMigrate}h × ${hourlyRate}/h</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Mất năng suất</p>
            <p className="text-xl font-bold text-foreground">${productivityLossCost.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">~{productivityLossDays} ngày learning curve</p>
          </div>
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-xs font-medium text-primary mb-1">Tổng chi phí chuyển đổi</p>
            <p className="text-2xl font-bold text-primary">${totalSwitchingCost.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">từ {tools[currentToolIdx]?.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Productivity Score ─── */
function ProductivityScore({ tools }: { tools: ToolWithScores[] }) {
  const data = tools.map((t) => {
    const ai = t.ai_scores;
    const ease = Number(ai?.ease_of_use) || 5;
    const feat = Number(ai?.features) || 5;
    const perf = Number(ai?.performance) || 5;
    const score = ((ease * 0.3 + feat * 0.4 + perf * 0.3) * 10).toFixed(0);
    const timeSaved = Math.round(ease * 0.5 + perf * 0.3); // hours/week estimated
    return { name: t.name, score: Number(score), timeSaved, ease, feat, perf };
  });

  const best = data.reduce((a, b) => (a.score > b.score ? a : b));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-warning" /> Productivity Score
        </CardTitle>
        <CardDescription>Ước tính mức tăng năng suất dựa trên AI Score</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(tools.length, 4)}, 1fr)` }}>
          {data.map((d, i) => (
            <div key={d.name} className={`rounded-lg border p-4 text-center ${d.name === best.name ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              {d.name === best.name && (
                <Badge className="bg-primary text-primary-foreground text-[10px] mb-2">🏆 Best Pick</Badge>
              )}
              <p className="text-sm font-semibold mb-2">{d.name}</p>
              <p className="text-3xl font-bold" style={{ color: CHART_COLORS[i] }}>{d.score}</p>
              <p className="text-[10px] text-muted-foreground">/100 productivity score</p>
              <div className="mt-3 space-y-1 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tiết kiệm ~</span>
                  <span className="font-medium">{d.timeSaved}h/tuần</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dễ sử dụng</span>
                  <span className="font-medium">{d.ease}/10</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tính năng</span>
                  <span className="font-medium">{d.feat}/10</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Compare Page ─── */
export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIds = useMemo(() => {
    const ids = searchParams.get("tools")?.split(",").filter(Boolean) || [];
    return ids.slice(0, 4);
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");

  const { data: selectedTools, isLoading } = useQuery({
    queryKey: ["compare-tools", selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(*)")
        .in("id", selectedIds)
        .eq("status", "published");
      if (error) throw error;
      return (data || []) as unknown as ToolWithScores[];
    },
    enabled: selectedIds.length > 0,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["search-tools-compare", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name, slug, logo_url, pricing_type, short_description")
        .eq("status", "published")
        .ilike("name", `%${searchQuery}%`)
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const addTool = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 4) return;
    const newIds = [...selectedIds, id];
    setSearchParams({ tools: newIds.join(",") });
    setSearchQuery("");
  };

  const removeTool = (id: string) => {
    const newIds = selectedIds.filter((i) => i !== id);
    setSearchParams(newIds.length > 0 ? { tools: newIds.join(",") } : {});
  };

  const tools = selectedTools || [];
  const colCount = tools.length;

  const compareRows = [
    { label: "Danh mục", key: "category", render: (t: ToolWithScores) => (t.categories as any)?.name || "—" },
    { label: "Giá", key: "pricing", render: (t: ToolWithScores) => pricingLabel[t.pricing_type] || t.pricing_type },
    { label: "Rating", key: "rating", render: (t: ToolWithScores) => (
      <span className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        {t.avg_rating ? Number(t.avg_rating).toFixed(1) : "—"} ({t.rating_count})
      </span>
    )},
    { label: "AI Score", key: "ai_score", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.overall_score ?? null} /> },
    { label: "Dễ sử dụng", key: "ease", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.ease_of_use ?? null} /> },
    { label: "Tính năng", key: "features", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.features ?? null} /> },
    { label: "Giá trị", key: "value", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.value_for_money ?? null} /> },
    { label: "Hiệu suất", key: "perf", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.performance ?? null} /> },
    { label: "Hỗ trợ", key: "support", render: (t: ToolWithScores) => <ScoreBar score={t.ai_scores?.support ?? null} /> },
    { label: "Platforms", key: "platforms", render: (t: ToolWithScores) => (
      <div className="flex flex-wrap gap-1">
        {t.platforms?.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>) || "—"}
      </div>
    )},
    { label: "Lượt xem", key: "views", render: (t: ToolWithScores) => t.view_count.toLocaleString() },
    { label: "AI Recommended", key: "recommended", render: (t: ToolWithScores) => (
      t.ai_scores?.is_recommended
        ? <Check className="h-4 w-4 text-accent" />
        : <Minus className="h-4 w-4 text-muted-foreground" />
    )},
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <GitCompareArrows className="h-8 w-8 text-primary" />
              So sánh công cụ
            </h1>
            <p className="mt-1 text-muted-foreground">Chọn 2-4 công cụ để so sánh chi tiết</p>
          </div>

          {/* Tool Selector */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                {tools.map((tool) => (
                  <div key={tool.id} className="flex items-center gap-2 rounded-full border border-border bg-muted/50 pl-1 pr-2 py-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-bold">
                      {tool.logo_url
                        ? <img src={tool.logo_url} alt={tool.name} className="h-full w-full rounded-full object-cover" />
                        : tool.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{tool.name}</span>
                    <button onClick={() => removeTool(tool.id)} className="rounded-full p-0.5 hover:bg-destructive/10">
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
                {selectedIds.length < 4 && (
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-full border border-dashed border-primary/40 px-3 py-1.5">
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Thêm công cụ..."
                        className="h-6 w-36 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                      />
                    </div>
                    {searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-popover p-1 shadow-lg">
                        {searchResults.filter((r) => !selectedIds.includes(r.id)).map((r) => (
                          <button
                            key={r.id}
                            onClick={() => addTool(r.id)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent/10 transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                              {r.logo_url
                                ? <img src={r.logo_url} alt={r.name} className="h-full w-full rounded-lg object-cover" />
                                : r.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{r.short_description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : tools.length < 2 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium">Chọn ít nhất 2 công cụ để bắt đầu so sánh</p>
              <p className="mt-1 text-sm text-muted-foreground">Tìm kiếm và thêm công cụ ở thanh phía trên</p>
            </div>
          ) : (
            <Tabs defaultValue="table" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="table">📊 Bảng</TabsTrigger>
                <TabsTrigger value="charts">📈 Biểu đồ</TabsTrigger>
                <TabsTrigger value="pricing">💰 Chi phí</TabsTrigger>
                <TabsTrigger value="tools">🔧 Công cụ</TabsTrigger>
              </TabsList>

              {/* TAB: Table */}
              <TabsContent value="table" className="space-y-6">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="w-36 p-4 text-left text-sm font-medium text-muted-foreground" />
                          {tools.map((tool) => (
                            <th key={tool.id} className="p-4 text-center" style={{ width: `${100 / (colCount + 1)}%` }}>
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-lg font-bold">
                                  {tool.logo_url
                                    ? <img src={tool.logo_url} alt={tool.name} className="h-full w-full rounded-xl object-cover" />
                                    : tool.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-sm">{tool.name}</span>
                                {tool.ai_scores?.is_recommended && (
                                  <Badge className="bg-primary/90 text-primary-foreground text-[10px]">⚡ AI Recommended</Badge>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.map((row, i) => (
                          <tr key={row.key} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                            <td className="p-3 text-sm font-medium text-muted-foreground">{row.label}</td>
                            {tools.map((tool) => (
                              <td key={tool.id} className="p-3 text-center text-sm">
                                <div className="flex items-center justify-center">{row.render(tool)}</div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Pros / Cons */}
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
                  {tools.map((tool) => (
                    <Card key={tool.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                        {tool.ai_scores?.summary && (
                          <p className="text-xs text-muted-foreground mt-1">{tool.ai_scores.summary}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {tool.ai_scores?.pros && tool.ai_scores.pros.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-accent mb-1">✅ Ưu điểm</p>
                            <ul className="space-y-1">
                              {tool.ai_scores.pros.map((p, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <Check className="h-3 w-3 mt-0.5 text-accent shrink-0" /> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {tool.ai_scores?.cons && tool.ai_scores.cons.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-destructive mb-1">❌ Nhược điểm</p>
                            <ul className="space-y-1">
                              {tool.ai_scores.cons.map((c, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <Minus className="h-3 w-3 mt-0.5 text-destructive shrink-0" /> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* TAB: Charts */}
              <TabsContent value="charts" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <CompareRadarChart tools={tools} />
                  <CompareBarChart tools={tools} />
                </div>
                <PricingTrendChart toolIds={selectedIds} tools={tools} />
              </TabsContent>

              {/* TAB: Pricing */}
              <TabsContent value="pricing" className="space-y-6">
                <ROICalculator tools={tools} />
                <SwitchingCostCalculator tools={tools} />
              </TabsContent>

              {/* TAB: Tools */}
              <TabsContent value="tools" className="space-y-6">
                <ProductivityScore tools={tools} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
