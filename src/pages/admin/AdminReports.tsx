import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Eye, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminReports() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [viewReport, setViewReport] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select("*, profiles:reporter_id(display_name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reports").update({
        status,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      logAuditAction("report_status_change", "report", vars.id, { status: vars.status });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const filtered = reports.filter((r: any) =>
    (r.reason || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.target_type || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300">Chờ xử lý</Badge>;
      case "resolved": return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Đã xử lý</Badge>;
      case "dismissed": return <Badge variant="secondary">Bỏ qua</Badge>;
      default: return <Badge variant="secondary">{s}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Reports</h1>
            <p className="text-muted-foreground">Xử lý báo cáo vi phạm từ người dùng</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {reports.filter((r: any) => r.status === "pending").length} chờ xử lý
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="resolved">Đã xử lý</SelectItem>
              <SelectItem value="dismissed">Bỏ qua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Người báo cáo</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không có báo cáo</TableCell></TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.target_type}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell>{(r.profiles as any)?.display_name || "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewReport(r)}><Eye className="h-4 w-4" /></Button>
                        {r.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => updateStatus.mutate({ id: r.id, status: "resolved" })} title="Xử lý">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => updateStatus.mutate({ id: r.id, status: "dismissed" })} title="Bỏ qua">
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!viewReport} onOpenChange={(v) => !v && setViewReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết báo cáo</DialogTitle></DialogHeader>
          {viewReport && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Loại:</span> {viewReport.target_type}</div>
              <div><span className="text-muted-foreground">Target ID:</span> <code className="text-xs bg-muted px-1 rounded">{viewReport.target_id}</code></div>
              <div><span className="text-muted-foreground">Lý do:</span> {viewReport.reason}</div>
              {viewReport.details && <div><span className="text-muted-foreground">Chi tiết:</span> {viewReport.details}</div>}
              <div><span className="text-muted-foreground">Người báo cáo:</span> {(viewReport.profiles as any)?.display_name || "—"}</div>
              <div><span className="text-muted-foreground">Ngày:</span> {new Date(viewReport.created_at).toLocaleString("vi-VN")}</div>
              <div><span className="text-muted-foreground">Trạng thái:</span> {viewReport.status}</div>
              {viewReport.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => { updateStatus.mutate({ id: viewReport.id, status: "resolved" }); setViewReport(null); }}>
                    <CheckCircle className="mr-1 h-3 w-3" /> Đã xử lý
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: viewReport.id, status: "dismissed" }); setViewReport(null); }}>
                    <XCircle className="mr-1 h-3 w-3" /> Bỏ qua
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
