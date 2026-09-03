import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/export";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Eye, AlertTriangle, Download, Trash2, FileText, Flag, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminReports() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewReport, setViewReport] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Stats
  const totalReports = reports.length;
  const pendingCount = reports.filter((r: any) => r.status === "pending").length;
  const resolvedCount = reports.filter((r: any) => r.status === "resolved").length;
  const dismissedCount = reports.filter((r: any) => r.status === "dismissed").length;

  // Target content loading for detail view
  const [targetContent, setTargetContent] = useState<any>(null);
  const loadTargetContent = async (report: any) => {
    setTargetContent(null);
    try {
      if (report.target_type === "comment") {
        const { data } = await supabase.from("comments").select("content, profiles:user_id(display_name)").eq("id", report.target_id).single();
        setTargetContent(data);
      } else if (report.target_type === "review") {
        const { data } = await supabase.from("reviews").select("title, content, profiles!reviews_author_id_fkey(display_name)").eq("id", report.target_id).single();
        setTargetContent(data);
      } else if (report.target_type === "question") {
        const { data } = await supabase.from("questions").select("title, content, profiles:user_id(display_name)").eq("id", report.target_id).single();
        setTargetContent(data);
      }
    } catch { /* ignore */ }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const update: any = { status, reviewed_by: user?.id || null, reviewed_at: new Date().toISOString() };
      if (note !== undefined) update.admin_note = note;
      const { error } = await supabase.from("reports").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      logAuditAction("report_status_change", "report", vars.id, { status: vars.status });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`${status === "resolved" ? "Xử lý" : "Bỏ qua"} ${ids.length} báo cáo?`)) return;
    for (const id of ids) {
      await supabase.from("reports").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    }
    logAuditAction(`report_bulk_${status}`, "report", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    setSelected(new Set());
    toast.success(`Đã cập nhật ${ids.length} báo cáo`);
  };

  const deleteTargetComment = async (reportId: string, targetId: string) => {
    if (!confirm("Xóa comment bị báo cáo?")) return;
    await supabase.from("comments").delete().eq("id", targetId);
    await supabase.from("reports").update({ status: "resolved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", reportId);
    logAuditAction("report_resolve_delete_comment", "report", reportId, { comment_id: targetId });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    setViewReport(null);
    toast.success("Đã xóa comment và xử lý báo cáo");
  };

  const filtered = reports.filter((r: any) => {
    const matchSearch = (r.reason || "").toLowerCase().includes(search.toLowerCase()) || (r.target_type || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.target_type === typeFilter;
    return matchSearch && matchType;
  });

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCSV = () => {
    const headers = ["Type", "Reason", "Details", "Reporter", "Status", "Admin Note", "Created"];
    const rows = filtered.map((r: any) => [r.target_type, r.reason, r.details || "", (r.profiles as any)?.display_name || "", r.status, r.admin_note || "", new Date(r.created_at).toLocaleDateString()]);
    exportToCSV(headers, rows, "reports.csv");
  };

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
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Reports</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Xử lý báo cáo vi phạm từ người dùng</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tổng reports</span></div>
            <p className="text-2xl font-bold mt-1">{totalReports}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Chờ xử lý</span></div>
            <p className="text-2xl font-bold mt-1">{pendingCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Đã xử lý</span></div>
            <p className="text-2xl font-bold mt-1">{resolvedCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Bỏ qua</span></div>
            <p className="text-2xl font-bold mt-1">{dismissedCount}</p>
          </CardContent></Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ xử lý</SelectItem>
              <SelectItem value="resolved">Đã xử lý</SelectItem>
              <SelectItem value="dismissed">Bỏ qua</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi loại</SelectItem>
              <SelectItem value="comment">Comment</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="question">Question</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <span className="text-sm font-medium">{selected.size} đã chọn</span>
              <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("resolved")}><CheckCircle className="mr-1 h-3.5 w-3.5" /> Xử lý tất cả</Button>
              <Button size="sm" variant="secondary" onClick={() => bulkUpdateStatus("dismissed")}><XCircle className="mr-1 h-3.5 w-3.5" /> Bỏ qua tất cả</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={() => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((r: any) => r.id))); }} /></TableHead>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có báo cáo</TableCell></TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                    <TableCell><Badge variant="outline">{r.target_type}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell>{(r.profiles as any)?.display_name || "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setViewReport(r); setAdminNote(r.admin_note || ""); loadTargetContent(r); }}><Eye className="h-4 w-4" /></Button>
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
        <DialogContent className="sm:max-w-lg">
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

              {/* Target content preview */}
              {targetContent && (
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">📄 Nội dung bị báo cáo:</p>
                  {targetContent.title && <p className="font-medium text-sm">{targetContent.title}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{targetContent.content?.slice(0, 300)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Bởi: {targetContent.profiles?.display_name || "—"}</p>
                </div>
              )}

              {/* Admin note */}
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Ghi chú admin:</span>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Ghi chú nội bộ..." rows={2} />
              </div>

              {viewReport.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => { updateStatus.mutate({ id: viewReport.id, status: "resolved", note: adminNote }); setViewReport(null); }}>
                    <CheckCircle className="mr-1 h-3 w-3" /> Đã xử lý
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: viewReport.id, status: "dismissed", note: adminNote }); setViewReport(null); }}>
                    <XCircle className="mr-1 h-3 w-3" /> Bỏ qua
                  </Button>
                  {viewReport.target_type === "comment" && (
                    <Button size="sm" variant="destructive" onClick={() => deleteTargetComment(viewReport.id, viewReport.target_id)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Xóa comment
                    </Button>
                  )}
                </div>
              )}
              {viewReport.status !== "pending" && adminNote !== (viewReport.admin_note || "") && (
                <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: viewReport.id, status: viewReport.status, note: adminNote }); setViewReport(null); }}>
                  <FileText className="mr-1 h-3 w-3" /> Lưu ghi chú
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}