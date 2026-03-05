import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Star, Rocket } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminLaunches() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: launches, isLoading } = useQuery({
    queryKey: ["admin-launches", filter],
    queryFn: async () => {
      let q = supabase
        .from("launches")
        .select("*, profiles:maker_id(display_name, avatar_url), tools(name, slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("launches").update({ status }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    toast.success(`Đã chuyển thành ${status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Chờ duyệt" },
      approved: { variant: "secondary", label: "Đã duyệt" },
      featured: { variant: "default", label: "Featured" },
      rejected: { variant: "destructive", label: "Từ chối" },
    };
    const s = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6" /> Quản lý Launches
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Duyệt, từ chối hoặc feature các sản phẩm submit</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Maker</TableHead>
                  <TableHead>Ngày launch</TableHead>
                  <TableHead>Upvotes</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {launches?.map((launch) => {
                  const tool = launch.tools as any;
                  const profile = launch.profiles as any;
                  return (
                    <TableRow key={launch.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tool?.name || launch.tagline}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{launch.description || launch.tagline}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{profile?.display_name || "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(launch.launch_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-sm font-medium">{launch.upvotes || 0}</TableCell>
                      <TableCell>{statusBadge(launch.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {launch.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>
                                <Check className="h-3 w-3" /> Duyệt
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "rejected")}>
                                <X className="h-3 w-3" /> Từ chối
                              </Button>
                            </>
                          )}
                          {launch.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "featured")}>
                              <Star className="h-3 w-3" /> Feature
                            </Button>
                          )}
                          {launch.status === "featured" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>
                              Bỏ Feature
                            </Button>
                          )}
                          {launch.status === "rejected" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>
                              <Check className="h-3 w-3" /> Duyệt lại
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {launches?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có launch nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
