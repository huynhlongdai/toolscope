import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Users, FileText, Eye, Download, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8884d8", "#82ca9d", "#ffc658"];

export default function AdminAnalytics() {
  const [range, setRange] = useState("30");

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const rangeDate = range === "all" ? undefined : daysAgo(Number(range));

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

  // Summary stats
  const { data: stats } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: async () => {
      const [tools, users, reviews, comments] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
      ]);
      const { data: viewData } = await supabase.from("tools").select("view_count");
      const totalViews = viewData?.reduce((s: number, t: any) => s + (t.view_count || 0), 0) || 0;
      return {
        tools: tools.count || 0,
        users: users.count || 0,
        reviews: reviews.count || 0,
        comments: comments.count || 0,
        totalViews,
      };
    },
  });

  const exportReport = () => {
    const report = { stats, toolsData, usersData, reviewsData, categoryData, topTools, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Thống kê tổng quan và xu hướng</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportReport}><Download className="mr-2 h-4 w-4" /> Export</Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/search-analytics"><BarChart3 className="mr-2 h-4 w-4" /> Search Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Tools", value: stats?.tools ?? 0, icon: FileText },
            { label: "Users", value: stats?.users ?? 0, icon: Users },
            { label: "Reviews", value: stats?.reviews ?? 0, icon: TrendingUp },
            { label: "Comments", value: stats?.comments ?? 0, icon: FileText },
            { label: "Total Views", value: stats?.totalViews?.toLocaleString() ?? 0, icon: Eye },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
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
            <CardHeader>
              <CardTitle className="text-base">Tools mới theo ngày</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle className="text-base">User đăng ký theo ngày</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle className="text-base">Reviews theo ngày</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle className="text-base">Phân bố theo Category</CardTitle>
            </CardHeader>
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

        {/* Top Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 tools được xem nhiều nhất</CardTitle>
          </CardHeader>
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
