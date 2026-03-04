import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Users, MessageSquare, Shield, Eye, Star } from "lucide-react";

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
      </div>
    </AdminLayout>
  );
}
