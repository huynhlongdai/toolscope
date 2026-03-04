import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Users, MessageSquare, Shield, Eye, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ title, value, icon: Icon, description }: { title: string; value: number | string; icon: any; description?: string }) {
  return (
    <Card>
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
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tools, users, reviews, pending] = await Promise.all([
        supabase.from("tools").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      ]);
      return {
        toolsCount: tools.count ?? 0,
        usersCount: users.count ?? 0,
        reviewsCount: reviews.count ?? 0,
        pendingCount: pending.count ?? 0,
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Tổng Tools" value={stats?.toolsCount ?? 0} icon={Wrench} />
          <StatCard title="Users" value={stats?.usersCount ?? 0} icon={Users} />
          <StatCard title="Reviews" value={stats?.reviewsCount ?? 0} icon={MessageSquare} />
          <StatCard title="Chờ duyệt" value={stats?.pendingCount ?? 0} icon={Shield} description="Tools pending review" />
        </div>

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
                    <span className="text-sm text-muted-foreground">{t.view_count.toLocaleString()} views</span>
                  </div>
                ))}
                {topTools.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
