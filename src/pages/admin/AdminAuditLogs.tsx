import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, History, Undo2 } from "lucide-react";
import { toast } from "sonner";

const REVERTABLE_ACTIONS = ["update_tool_status", "update_review_status", "update_launch_status", "ban_user", "unban_user"];

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [revertLog, setRevertLog] = useState<any>(null);
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, entityTypeFilter],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (entityTypeFilter !== "all") q = q.eq("entity_type", entityTypeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))].sort();
  const uniqueEntityTypes = [...new Set(logs.filter((l: any) => l.entity_type).map((l: any) => l.entity_type))].sort();

  const filtered = logs.filter((l: any) =>
    (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_type || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_id || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = (action: string) => {
    if (action.includes("delete") || action.includes("ban")) return "destructive";
    if (action.includes("approve") || action.includes("publish")) return "default";
    if (action.includes("update") || action.includes("edit")) return "secondary";
    return "outline";
  };

  const canRevert = (log: any) => {
    return REVERTABLE_ACTIONS.includes(log.action) && log.entity_id && log.details;
  };

  const handleRevert = async () => {
    if (!revertLog) return;
    try {
      const details = revertLog.details || {};
      if (revertLog.action === "update_tool_status" && details.old_status) {
        await supabase.from("tools").update({ status: details.old_status }).eq("id", revertLog.entity_id);
      } else if (revertLog.action === "update_review_status" && details.old_status) {
        await supabase.from("reviews").update({ status: details.old_status }).eq("id", revertLog.entity_id);
      } else if (revertLog.action === "update_launch_status" && details.old_status) {
        await supabase.from("launches").update({ status: details.old_status }).eq("id", revertLog.entity_id);
      } else if (revertLog.action === "ban_user") {
        await supabase.from("profiles").update({ is_banned: false }).eq("id", revertLog.entity_id);
      } else if (revertLog.action === "unban_user") {
        await supabase.from("profiles").update({ is_banned: true }).eq("id", revertLog.entity_id);
      } else {
        toast.error("Không thể revert action này");
        return;
      }
      toast.success("Đã revert thành công");
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    } catch {
      toast.error("Revert thất bại");
    } finally {
      setRevertLog(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 md:h-7 md:w-7" /> Audit Logs
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Theo dõi các thao tác quản trị trên hệ thống</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm theo action, entity, user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả actions</SelectItem>
              {uniqueActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Entity type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả entities</SelectItem>
              {uniqueEntityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Chi tiết</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có audit log nào</TableCell></TableRow>
              ) : (
                filtered.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColor(log.action) as any} className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{log.entity_type || "—"}</Badge></TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.entity_id?.slice(0, 8) || "—"}</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.user_id?.slice(0, 8) || "—"}</code>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details).slice(0, 100) : "—"}
                    </TableCell>
                    <TableCell>
                      {canRevert(log) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRevertLog(log)} title="Revert">
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">Hiển thị {filtered.length} / {logs.length} log gần nhất</p>
      </div>

      {/* Revert Dialog */}
      <Dialog open={!!revertLog} onOpenChange={(o) => !o && setRevertLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận Revert</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Bạn muốn hoàn tác thao tác:</p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p><strong>Action:</strong> {revertLog?.action}</p>
              <p><strong>Entity:</strong> {revertLog?.entity_type} — {revertLog?.entity_id?.slice(0, 12)}...</p>
              {revertLog?.details?.old_status && <p><strong>Khôi phục về:</strong> {revertLog.details.old_status}</p>}
              {revertLog?.action === "ban_user" && <p><strong>Hành động:</strong> Unban user</p>}
              {revertLog?.action === "unban_user" && <p><strong>Hành động:</strong> Ban user lại</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertLog(null)}>Hủy</Button>
            <Button onClick={handleRevert}>Xác nhận Revert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
