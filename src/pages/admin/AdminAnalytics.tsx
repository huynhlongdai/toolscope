import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, FileText, Eye, Download, BarChart3, Tag, MousePointerClick } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8884d8", "#82ca9d", "#ffc658"];

export default function AdminAnalytics() {
  const [range, setRange] = useState("30");

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const rangeDate = range === "all" ? undefined : daysAgo(Number(range));
  const prevRangeDate = range === "all" ? undefined : daysAgo(Number(range) * 2);

  // Tools over time
  const { data: toolsData = [] } = useQuery({
    queryKey: ["analytics-tools", range],
    queryFn: async () => {
      let q = supabase.from("tools").select("created_at").order("created_at");
      if (rangeDate) q = q.gte("created_at", rangeDate);
      const { data } = await q;
      return groupByDay(data ?? [], "created_at");
    },
  });

  // Users over time
  const { data: usersData = [] } = useQuery({
    queryKey: ["analytics-users", range],
    queryFn: async () => {
      let q = supabase.from("profiles").select("created_at").order("created_at");
      if (rangeDate) q = q.gte("created_at", rangeDate);
      const { data } = await q;
      return groupByDay(data ?? [], "created_at");
    },
  });

  // Reviews over time
  const { data: reviewsData = [] } = useQuery({
    queryKey: ["analytics-reviews", range],
    queryFn: async () => {
      let q = supabase.from("reviews").select("created_at").order("created_at");
      if (rangeDate) q = q.gte("created_at", rangeDate);
      const { data } = await q;
      return groupByDay(data ?? [], "created_at");
    },
  });

  // Top categories
  const { data: categoryData = [] } = useQuery({
    queryKey: ["analytics-categories"],
    queryFn: async () => {
      const { data: tools } = await supabase.from("tools").select("category_id, categories(name)").eq("status", "published");
      const map: Record<string, { name: string; count: number }> = {};
      tools?.forEach((t: any) => {
        const name = t.categories?.name || "Chưa phân loại";
        if (!map[name]) map[name] = { name, count: 0 };
        map[name].count++;
      });
      return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
    },
  });

  // Top viewed tools
  const { data: topTools = [] } = useQuery({
    queryKey: ["analytics-top-tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("name, view_count, slug").eq("status", "published").order("view_count", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  // Summary stats with period comparison
  const { data: stats } = useQuery({
    queryKey: ["analytics-stats", range],
    queryFn: async () => {
      const [tools, users, reviews, comments] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
      ]);
      const { data: viewData } = await supabase.from("tools").select("view_count");
      const totalViews = viewData?.reduce((s: number, t: any) => s + (t.view_count || 0), 0) || 0;

      // Period comparison: current vs previous period
      let currentCount = { tools: 0, users: 0, reviews: 0 };
      let prevCount = { tools: 0, users: 0, reviews: 0 };
      if (rangeDate && prevRangeDate) {
        const [ct, cu, cr, pt, pu, pr] = await Promise.all([
          supabase.from("tools").select("id", { count: "exact", head: true }).gte("created_at", rangeDate),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", rangeDate),
          supabase.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", rangeDate),
          supabase.from("tools").select("id", { count: "exact", head: true }).gte("created_at", prevRangeDate).lt("created_at", rangeDate),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", prevRangeDate).lt("created_at", rangeDate),
          supabase.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", prevRangeDate).lt("created_at", rangeDate),
        ]);
        currentCount = { tools: ct.count || 0, users: cu.count || 0, reviews: cr.count || 0 };
        prevCount = { tools: pt.count || 0, users: pu.count || 0, reviews: pr.count || 0 };
      }

      return {
        tools: tools.count || 0, users: users.count || 0, reviews: reviews.count || 0,
        comments: comments.count || 0, totalViews,
        currentCount, prevCount,
      };
    },
  });

  // Deals analytics
  const { data: dealsStats } = useQuery({
    queryKey: ["analytics-deals"],
    queryFn: async () => {
      const { data: deals } = await supabase.from("deals").select("id, title, click_count, upvotes, discount_value, discount_type, is_active, tool_id, tools(name)").order("click_count", { ascending: false }).limit(10);
      const { count: activeCount } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_active", true);
      const { count: totalCount } = await supabase.from("deals").select("id", { count: "exact", head: true });
      const totalClicks = deals?.reduce((s, d: any) => s + (d.click_count || 0), 0) || 0;
      return { topDeals: deals ?? [], activeCount: activeCount || 0, totalCount: totalCount || 0, totalClicks };
    },
  });

  const calcChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const exportReport = () => {
    const report = { stats, toolsData, usersData, reviewsData, categoryData, topTools, dealsStats, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Thống kê tổng quan và xu hướng</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportReport}><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/search-analytics"><BarChart3 className="mr-1 h-3.5 w-3.5" /> Search</Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards with comparison */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Tools", value: stats?.tools ?? 0, icon: FileText, change: stats?.currentCount ? calcChange(stats.currentCount.tools, stats.prevCount.tools) : null },
            { label: "Users", value: stats?.users ?? 0, icon: Users, change: stats?.currentCount ? calcChange(stats.currentCount.users, stats.prevCount.users) : null },
            { label: "Reviews", value: stats?.reviews ?? 0, icon: TrendingUp, change: stats?.currentCount ? calcChange(stats.currentCount.reviews, stats.prevCount.reviews) : null },
            { label: "Comments", value: stats?.comments ?? 0, icon: FileText, change: null },
            { label: "Total Views", value: stats?.totalViews?.toLocaleString() ?? 0, icon: Eye, change: null },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                    {s.change !== null && range !== "all" && (
                      <p className={`text-xs mt-1 ${s.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {s.change >= 0 ? "↑" : "↓"} {Math.abs(s.change)}% vs kỳ trước
                      </p>
                    )}
                  </div>
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Tools mới theo ngày</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={toolsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">User đăng ký theo ngày</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={usersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Reviews theo ngày</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reviewsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Phân bố theo Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {categoryData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Deals Analytics */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold">{dealsStats?.activeCount ?? 0} <span className="text-sm font-normal text-muted-foreground">/ {dealsStats?.totalCount ?? 0}</span></p>
                </div>
                <Tag className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deal Clicks</p>
                  <p className="text-2xl font-bold">{dealsStats?.totalClicks?.toLocaleString() ?? 0}</p>
                </div>
                <MousePointerClick className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Clicks/Deal</p>
                  <p className="text-2xl font-bold">{dealsStats?.totalCount ? Math.round(dealsStats.totalClicks / dealsStats.totalCount) : 0}</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Deals by clicks */}
        {dealsStats?.topDeals && dealsStats.topDeals.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Top Deals theo lượt click</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealsStats.topDeals.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="click_count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Tools */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 tools được xem nhiều nhất</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTools} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="view_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function groupByDay(items: any[], dateField: string) {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const day = new Date(item[dateField]).toISOString().slice(0, 10);
    map[day] = (map[day] || 0) + 1;
  });
  return Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count }));
}
