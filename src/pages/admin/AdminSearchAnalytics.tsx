import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Search, TrendingUp, AlertTriangle, Plus, Trash2, Edit, BarChart3, Zap, Bot, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay } from "date-fns";

function useSearchLogs() {
  return useQuery({
    queryKey: ["admin-search-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });
}

function useSearchRules() {
  return useQuery({
    queryKey: ["admin-search-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function useAutoRuleSettings() {
  return useQuery({
    queryKey: ["auto-rule-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["auto_rule_threshold", "auto_rule_enabled"]);
      const map: Record<string, any> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return {
        enabled: map.auto_rule_enabled === true || map.auto_rule_enabled === "true",
        threshold: Number(map.auto_rule_threshold) || 10,
      };
    },
  });
}

function StatsCards({ logs, rules }: { logs: any[]; rules: any[] }) {
  const today = startOfDay(new Date());
  const week = subDays(today, 7);
  const todayCount = logs.filter(l => new Date(l.created_at) >= today).length;
  const weekCount = logs.filter(l => new Date(l.created_at) >= week).length;
  const uniqueKeywords = new Set(logs.map(l => l.normalized_query)).size;
  const zeroResults = logs.filter(l => l.results_count === 0).length;
  const zeroRate = logs.length > 0 ? ((zeroResults / logs.length) * 100).toFixed(1) : "0";

  // Estimate credits saved: logs that have matched_tool_ids and a matching rule
  const autoRules = rules.filter(r => r.is_auto);
  const rulePatterns = rules.filter(r => r.is_active).map(r => ({ pattern: r.keyword_pattern?.toLowerCase(), type: r.match_type }));
  const ruleMatchedLogs = logs.filter(l => {
    const nq = l.normalized_query;
    return rulePatterns.some(rp => {
      if (rp.type === "exact") return nq === rp.pattern;
      if (rp.type === "contains") return nq.includes(rp.pattern);
      return false;
    });
  });

  const stats = [
    { label: "Hôm nay", value: todayCount, icon: Search },
    { label: "7 ngày", value: weekCount, icon: TrendingUp },
    { label: "Từ khóa unique", value: uniqueKeywords, icon: BarChart3 },
    { label: "Tỷ lệ 0 kết quả", value: `${zeroRate}%`, icon: AlertTriangle },
    { label: "Rule tự động", value: autoRules.length, icon: Bot },
    { label: "Credit tiết kiệm", value: `~${ruleMatchedLogs.length}`, icon: Zap },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {stats.map(s => (
        <Card key={s.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className="h-6 w-6 text-muted-foreground/30 shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TopKeywordsChart({ logs }: { logs: any[] }) {
  const counts: Record<string, number> = {};
  for (const l of logs) {
    counts[l.normalized_query] = (counts[l.normalized_query] || 0) + 1;
  }
  const chartData = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword: keyword.length > 20 ? keyword.slice(0, 20) + "…" : keyword, count }));

  return (
    <Card>
      <CardHeader><CardTitle>Top từ khóa tìm kiếm</CardTitle></CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu tìm kiếm</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="keyword" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SearchTrendChart({ logs }: { logs: any[] }) {
  const dailyCounts: Record<string, number> = {};
  for (const l of logs) {
    const day = format(new Date(l.created_at), "yyyy-MM-dd");
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }
  const chartData = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date: format(new Date(date), "dd/MM"), count }));

  return (
    <Card>
      <CardHeader><CardTitle>Xu hướng tìm kiếm (30 ngày)</CardTitle></CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ZeroResultsTable({ logs }: { logs: any[] }) {
  const zeroLogs = logs.filter(l => l.results_count === 0);
  const counts: Record<string, number> = {};
  for (const l of zeroLogs) {
    counts[l.normalized_query] = (counts[l.normalized_query] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Từ khóa không có kết quả</CardTitle></CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Không có</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Từ khóa</TableHead><TableHead className="w-24 text-right">Số lần</TableHead></TableRow></TableHeader>
            <TableBody>
              {sorted.map(([kw, count]) => (
                <TableRow key={kw}>
                  <TableCell className="font-medium">{kw}</TableCell>
                  <TableCell className="text-right"><Badge variant="destructive">{count}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AutoRuleSettings() {
  const { data: settings, isLoading } = useAutoRuleSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [threshold, setThreshold] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-rule-settings"] });
      toast({ title: "Đã lưu cài đặt" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Lỗi", description: e.message }),
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-search-patterns");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["admin-search-rules"] });
      toast({
        title: "Phân tích hoàn tất",
        description: `Đã tạo ${data.rules_created} rule mới từ ${data.clusters_found || 0} nhóm từ khóa.`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi phân tích", description: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Tự động tạo Rule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={v => saveMutation.mutate({ key: "auto_rule_enabled", value: v })}
            />
            <Label>Bật tự động</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Ngưỡng:</Label>
            <Input
              type="number"
              className="w-20"
              value={threshold || String(settings?.threshold || 10)}
              onChange={e => setThreshold(e.target.value)}
              onBlur={() => {
                const val = Number(threshold);
                if (val > 0) saveMutation.mutate({ key: "auto_rule_threshold", value: val });
              }}
              min={1}
            />
            <span className="text-sm text-muted-foreground">lượt tìm</span>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing} size="sm" variant="outline" className="ml-auto">
            <Bot className="h-4 w-4 mr-1" />
            {analyzing ? "Đang phân tích..." : "Phân tích & tạo rule"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Khi bật, hệ thống sẽ phân tích các từ khóa tìm kiếm tương tự. Nếu tổng lượt tìm vượt ngưỡng, tự động tạo rule ghim tool phù hợp để lần tìm sau không cần gọi AI.
        </p>
      </CardContent>
    </Card>
  );
}

function RulesManager() {
  const { data: rules = [], isLoading } = useSearchRules();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState({ keyword_pattern: "", match_type: "contains", pinned_tool_ids: "", redirect_url: "", is_active: true });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        keyword_pattern: data.keyword_pattern,
        match_type: data.match_type,
        pinned_tool_ids: data.pinned_tool_ids ? data.pinned_tool_ids.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        redirect_url: data.redirect_url || null,
        is_active: data.is_active,
      };
      if (editRule) {
        const { error } = await supabase.from("search_rules").update(payload).eq("id", editRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("search_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-search-rules"] });
      setOpen(false);
      setEditRule(null);
      toast({ title: "Đã lưu rule" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Lỗi", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("search_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-search-rules"] });
      toast({ title: "Đã xóa rule" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("search_rules").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-search-rules"] }),
  });

  const openCreate = () => {
    setEditRule(null);
    setForm({ keyword_pattern: "", match_type: "contains", pinned_tool_ids: "", redirect_url: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditRule(rule);
    setForm({
      keyword_pattern: rule.keyword_pattern,
      match_type: rule.match_type,
      pinned_tool_ids: (rule.pinned_tool_ids || []).join(", "),
      redirect_url: rule.redirect_url || "",
      is_active: rule.is_active,
    });
    setOpen(true);
  };

  const autoCount = rules.filter(r => r.is_auto).length;
  const manualCount = rules.length - autoCount;

  return (
    <div className="space-y-4">
      <AutoRuleSettings />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Search Rules</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {manualCount} thủ công · {autoCount} tự động
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Thêm rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editRule ? "Sửa rule" : "Thêm rule mới"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Keyword pattern</Label>
                  <Input value={form.keyword_pattern} onChange={e => setForm(f => ({ ...f, keyword_pattern: e.target.value }))} placeholder="vd: design tool" />
                </div>
                <div>
                  <Label>Match type</Label>
                  <Select value={form.match_type} onValueChange={v => setForm(f => ({ ...f, match_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pinned tool IDs (comma separated)</Label>
                  <Input value={form.pinned_tool_ids} onChange={e => setForm(f => ({ ...f, pinned_tool_ids: e.target.value }))} placeholder="uuid1, uuid2" />
                </div>
                <div>
                  <Label>Redirect URL (optional)</Label>
                  <Input value={form.redirect_url} onChange={e => setForm(f => ({ ...f, redirect_url: e.target.value }))} placeholder="/category/design" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <Button onClick={() => saveMutation.mutate(form)} disabled={!form.keyword_pattern || saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có rule nào</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Pinned</TableHead>
                    <TableHead className="hidden md:table-cell">Nguồn</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{r.keyword_pattern}</span>
                          {r.is_auto && <Badge variant="secondary" className="text-[10px] px-1.5"><Bot className="h-3 w-3 mr-0.5" />Auto</Badge>}
                        </div>
                        {r.source_keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.source_keywords.slice(0, 3).map((sk: string, i: number) => (
                              <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{sk}</span>
                            ))}
                            {r.source_keywords.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{r.source_keywords.length - 3}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.match_type}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{r.pinned_tool_ids?.length || 0} tools</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {r.is_auto ? <Badge variant="secondary">AI</Badge> : <Badge variant="outline">Manual</Badge>}
                      </TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={v => toggleMutation.mutate({ id: r.id, active: v })} />
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSearchAnalytics() {
  const { data: logs = [], isLoading } = useSearchLogs();
  const { data: rules = [] } = useSearchRules();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Search Analytics</h2>
          <p className="text-sm text-muted-foreground">Thống kê từ khóa tìm kiếm và quản lý quy tắc kết quả</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="keywords">Từ khóa</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <StatsCards logs={logs} rules={rules} />
              <SearchTrendChart logs={logs} />
            </TabsContent>

            <TabsContent value="keywords" className="space-y-6 mt-4">
              <TopKeywordsChart logs={logs} />
              <ZeroResultsTable logs={logs} />
            </TabsContent>

            <TabsContent value="rules" className="mt-4">
              <RulesManager />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
