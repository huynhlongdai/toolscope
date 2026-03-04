import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitCompareArrows, Plus, X, Star, Check, Minus, Calculator,
  TrendingUp, Sparkles, Users, DollarSign, Loader2
} from "lucide-react";

const pricingLabel: Record<string, string> = {
  free: "Miễn phí", freemium: "Freemium", paid: "Trả phí",
  open_source: "Open Source", contact: "Liên hệ",
};

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

function ROICalculator({ tools }: { tools: ToolWithScores[] }) {
  const [teamSize, setTeamSize] = useState(10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" /> ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">Team size:</label>
          <Input
            type="number" min={1} max={1000} value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value) || 1)}
            className="h-8 w-24"
          />
          <span className="text-sm text-muted-foreground">người</span>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${tools.length}, 1fr)` }}>
          {tools.map((tool) => {
            const pricing = tool.pricing_details as any;
            const monthlyPerUser = pricing?.monthly_price || (tool.pricing_type === "free" ? 0 : null);
            const monthlyCost = monthlyPerUser != null ? monthlyPerUser * teamSize : null;
            const yearlyCost = monthlyCost != null ? monthlyCost * 12 : null;

            return (
              <div key={tool.id} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-sm font-semibold mb-2">{tool.name}</p>
                {monthlyCost != null ? (
                  <>
                    <p className="text-2xl font-bold text-primary">${monthlyCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">/tháng</p>
                    <p className="mt-1 text-sm font-medium">${yearlyCost!.toLocaleString()}/năm</p>
                    <p className="text-[10px] text-muted-foreground">${monthlyPerUser}/user/tháng</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {tool.pricing_type === "free" ? "Miễn phí" : "Liên hệ để báo giá"}
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

          {/* Compare Table */}
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : tools.length < 2 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium">Chọn ít nhất 2 công cụ để bắt đầu so sánh</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tìm kiếm và thêm công cụ ở thanh phía trên
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main comparison card */}
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
                                <Badge className="bg-primary/90 text-primary-foreground text-[10px]">
                                  ⚡ AI Recommended
                                </Badge>
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

              {/* ROI Calculator */}
              <ROICalculator tools={tools} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
