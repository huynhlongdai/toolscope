import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Users, MessageSquare, Shield, Eye, TrendingUp, Flag, Newspaper, Star, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tools, users, reviews, pending, reports, newsletter, deals] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        toolsCount: tools.count ?? 0,
        usersCount: users.count ?? 0,
        reviewsCount: reviews.count ?? 0,
        pendingCount: pending.count ?? 0,
        reportsCount: reports.count ?? 0,
        newsletterCount: newsletter.count ?? 0,
        dealsCount: deals.count ?? 0,
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

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [recentReviews, recentTools] = await Promise.all([
        supabase.from("reviews").select("title, created_at, profiles:author_id(display_name)").order("created_at", { ascending: false }).limit(3),
        supabase.from("tools").select("name, created_at, status").order("created_at", { ascending: false }).limit(3),
      ]);
      const items: any[] = [];
      recentReviews.data?.forEach((r: any) => items.push({ type: "review", text: `Review: ${r.title}`, by: r.profiles?.display_name, time: r.created_at }));
      recentTools.data?.forEach((t: any) => items.push({ type: "tool", text: `Tool: ${t.name}`, status: t.status, time: t.created_at }));
      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Tổng Tools" value={stats?.toolsCount ?? 0} icon={Wrench} href="/admin/tools" />
          <StatCard title="Users" value={stats?.usersCount ?? 0} icon={Users} href="/admin/users" />
          <StatCard title="Reviews" value={stats?.reviewsCount ?? 0} icon={MessageSquare} href="/admin/reviews" />
          <StatCard title="Chờ duyệt" value={stats?.pendingCount ?? 0} icon={Shield} description="Tools pending review" href="/admin/tools" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Báo cáo chờ xử lý" value={stats?.reportsCount ?? 0} icon={Flag} href="/admin/reports" />
          <StatCard title="Newsletter" value={stats?.newsletterCount ?? 0} icon={Newspaper} description="Subscribers active" href="/admin/newsletter" />
          <StatCard title="Deals đang hoạt động" value={stats?.dealsCount ?? 0} icon={Star} href="/admin/deals" />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Thao tác nhanh</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/admin/tools"><Wrench className="mr-1.5 h-3.5 w-3.5" /> Duyệt tools</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/reports"><Flag className="mr-1.5 h-3.5 w-3.5" /> Xử lý reports</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/collect"><TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Thu thập AI</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin/settings"><Eye className="mr-1.5 h-3.5 w-3.5" /> Cài đặt</Link></Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
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
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Hoạt động gần đây</CardTitle></CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{item.text} {item.by && <span className="text-muted-foreground">bởi {item.by}</span>}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.time).toLocaleDateString("vi-VN")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có hoạt động</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
