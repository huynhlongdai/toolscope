import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Users, MessageSquare, Shield, Eye, TrendingUp, Flag, Newspaper, Star, HeartPulse, FileText, GitBranch, Globe, Activity } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

function StatCard({ title, value, icon: Icon, description, href }: { title: string; value: number | string; icon: any; description?: string; href?: string }) {
  const content = (
    <Card className={href ? "hover:border-primary/40 transition-colors cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const [realtimeActivity, setRealtimeActivity] = useState<any[]>([]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tools, users, reviews, pending, reports, newsletter, deals, workflows, blogs, translations] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("translations").select("id", { count: "exact", head: true }),
      ]);
      return {
        toolsCount: tools.count ?? 0,
        usersCount: users.count ?? 0,
        reviewsCount: reviews.count ?? 0,
        pendingCount: pending.count ?? 0,
        reportsCount: reports.count ?? 0,
        newsletterCount: newsletter.count ?? 0,
        dealsCount: deals.count ?? 0,
        workflowsCount: workflows.count ?? 0,
        blogsCount: blogs.count ?? 0,
        translationsCount: translations.count ?? 0,
      };
    },
  });

  const { data: healthStats } = useQuery({
    queryKey: ["admin-health-stats"],
    queryFn: async () => {
      const [active, warning, dead, unknown] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("health_status", "active"),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("health_status", "warning"),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("health_status", "dead"),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("health_status", "unknown"),
      ]);
      return { active: active.count ?? 0, warning: warning.count ?? 0, dead: dead.count ?? 0, unknown: unknown.count ?? 0 };
    },
  });

  const { data: aiUsageStats } = useQuery({
    queryKey: ["admin-ai-usage-7d"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from("ai_usage_logs").select("status, tokens_used").gte("created_at", sevenDaysAgo);
      if (!data) return { total: 0, success: 0, failed: 0, tokens: 0 };
      return {
        total: data.length,
        success: data.filter(d => d.status === "success").length,
        failed: data.filter(d => d.status !== "success").length,
        tokens: data.reduce((sum, d) => sum + (d.tokens_used || 0), 0),
      };
    },
  });

  const { data: topTools = [] } = useQuery({
    queryKey: ["admin-top-tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("name, view_count").order("view_count", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: weeklyTools = [] } = useQuery({
    queryKey: ["admin-weekly-tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("created_at").order("created_at", { ascending: false }).limit(100);
      if (!data) return [];
      const weeks: Record<string, number> = {};
      data.forEach((t: any) => {
        const d = new Date(t.created_at);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        weeks[key] = (weeks[key] || 0) + 1;
      });
      return Object.entries(weeks).slice(0, 8).reverse().map(([week, count]) => ({ week, count }));
    },
  });

  const { data: dailyViews = [] } = useQuery({
    queryKey: ["admin-daily-views"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from("search_logs").select("created_at").gte("created_at", sevenDaysAgo);
      if (!data) return [];
      const days: Record<string, number> = {};
      data.forEach((s: any) => {
        const key = new Date(s.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        days[key] = (days[key] || 0) + 1;
      });
      return Object.entries(days).map(([day, count]) => ({ day, count }));
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  // Realtime subscription for audit_logs
  useEffect(() => {
    const channel = supabase
      .channel("admin-audit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        setRealtimeActivity(prev => [payload.new, ...prev].slice(0, 10));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const allActivity = [...realtimeActivity, ...recentActivity]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const formatAction = (log: any) => {
    const icons: Record<string, string> = { tool: "🔧", review: "⭐", blog: "📝", deal: "🏷️", user: "👤", category: "📂" };
    return `${icons[log.entity_type] || "📋"} ${log.action}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tổng quan</h1>

        {/* Row 1 - Core stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Tổng Tools" value={stats?.toolsCount ?? 0} icon={Wrench} href="/admin/tools" />
          <StatCard title="Users" value={stats?.usersCount ?? 0} icon={Users} href="/admin/users" />
          <StatCard title="Reviews" value={stats?.reviewsCount ?? 0} icon={MessageSquare} href="/admin/reviews" />
          <StatCard title="Chờ duyệt" value={stats?.pendingCount ?? 0} icon={Shield} description="Tools pending review" href="/admin/tools" />
        </div>

        {/* Row 2 - Extended stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Blog Posts" value={stats?.blogsCount ?? 0} icon={FileText} href="/admin/blog" />
          <StatCard title="Newsletter" value={stats?.newsletterCount ?? 0} icon={Newspaper} description="Subscribers active" href="/admin/newsletter" />
          <StatCard title="Deals hoạt động" value={stats?.dealsCount ?? 0} icon={Star} href="/admin/deals" />
          <StatCard title="Translations" value={stats?.translationsCount ?? 0} icon={Globe} href="/admin/translations" />
        </div>

        {/* Row 3 - Health & Reports */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Báo cáo chờ" value={stats?.reportsCount ?? 0} icon={Flag} href="/admin/reports" />
          <StatCard
            title="Tool Health"
            value={`🟢${healthStats?.active ?? 0} 🟡${healthStats?.warning ?? 0} 🔴${healthStats?.dead ?? 0}`}
            icon={HeartPulse}
            description={`${healthStats?.unknown ?? 0} chưa kiểm tra`}
            href="/admin/tools"
          />
          <StatCard
            title="AI Usage (7 ngày)"
            value={aiUsageStats?.total ?? 0}
            icon={Activity}
            description={`✅ ${aiUsageStats?.success ?? 0} | ❌ ${aiUsageStats?.failed ?? 0} | ${((aiUsageStats?.tokens ?? 0) / 1000).toFixed(1)}k tokens`}
          />
          <StatCard title="Featured Tools" value={stats?.workflowsCount ?? 0} icon={GitBranch} href="/admin/tools" />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Thao tác nhanh</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/admin/tools"><Wrench className="mr-1.5 h-3.5 w-3.5" /> Duyệt tools</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/reports"><Flag className="mr-1.5 h-3.5 w-3.5" /> Xử lý reports</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/collect"><TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Thu thập AI</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/blog"><FileText className="mr-1.5 h-3.5 w-3.5" /> Tạo blog</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/translations"><Globe className="mr-1.5 h-3.5 w-3.5" /> Dịch thuật</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/settings"><Eye className="mr-1.5 h-3.5 w-3.5" /> Cài đặt</Link></Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Weekly tools bar chart */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Tools mới theo tuần</CardTitle></CardHeader>
            <CardContent>
              {weeklyTools.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyTools}>
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
              )}
            </CardContent>
          </Card>

          {/* Daily search activity line chart */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Lượt tìm kiếm 7 ngày</CardTitle></CardHeader>
            <CardContent>
              {dailyViews.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyViews}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Tools */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Top 5 Tools xem nhiều</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTools.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{i + 1}. {t.name}</span>
                    <span className="text-sm text-muted-foreground">{t.view_count?.toLocaleString()} views</span>
                  </div>
                ))}
                {topTools.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>}
              </div>
            </CardContent>
          </Card>

          {/* Realtime Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Hoạt động gần đây
                {realtimeActivity.length > 0 && <Badge variant="secondary" className="text-[10px] animate-pulse">Live</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allActivity.length > 0 ? (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                  {allActivity.map((item: any, i: number) => (
                    <div key={item.id || i} className="flex items-start justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                      <div className="min-w-0">
                        <span className="font-medium">{formatAction(item)}</span>
                        {item.entity_id && <span className="text-muted-foreground text-xs ml-1">#{item.entity_id.slice(0, 8)}</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có hoạt động</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
