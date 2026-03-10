import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Database, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, XCircle, Loader2, ServerCog } from "lucide-react";
import { format } from "date-fns";

const SYNCABLE_TABLES = [
  { id: "tools", label: "Tools", description: "Công cụ AI" },
  { id: "categories", label: "Categories", description: "Danh mục" },
  { id: "tags", label: "Tags", description: "Thẻ tag" },
  { id: "tool_tags", label: "Tool Tags", description: "Liên kết tool-tag" },
  { id: "reviews", label: "Reviews", description: "Đánh giá" },
  { id: "blog_posts", label: "Blog Posts", description: "Bài viết blog" },
  { id: "site_settings", label: "Site Settings", description: "Cài đặt hệ thống" },
  { id: "menus", label: "Menus", description: "Menu điều hướng" },
  { id: "pages", label: "Pages", description: "Trang tĩnh" },
  { id: "deals", label: "Deals", description: "Ưu đãi" },
  { id: "tasks", label: "Tasks", description: "Nhiệm vụ" },
  { id: "collections", label: "Collections", description: "Bộ sưu tập" },
  { id: "collection_items", label: "Collection Items", description: "Items trong BST" },
  { id: "launches", label: "Launches", description: "Ra mắt sản phẩm" },
  { id: "follows", label: "Follows", description: "Theo dõi" },
  { id: "notifications", label: "Notifications", description: "Thông báo" },
  { id: "user_roles", label: "User Roles", description: "Phân quyền" },
];

interface SetupResult {
  table: string;
  status: string;
}

export default function AdminSync() {
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>(SYNCABLE_TABLES.map((t) => t.id));
  const [direction, setDirection] = useState<"push" | "pull" | "both">("push");
  const [setupResults, setSetupResults] = useState<SetupResult[] | null>(null);

  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Setup external DB mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/setup-external-db`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Setup failed");
      return result;
    },
    onSuccess: (data) => {
      setSetupResults(data.tables);
      toast({
        title: data.success ? "Khởi tạo thành công!" : "Khởi tạo có lỗi",
        description: `${data.tables?.filter((t: SetupResult) => t.status === "ok").length || 0} bảng đã sẵn sàng`,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Lỗi khởi tạo", description: err.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-database`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ direction, tables: selectedTables }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      toast({
        title: "Đồng bộ hoàn tất",
        description: `Pushed: ${data.summary.pushed}, Pulled: ${data.summary.pulled}, Conflicts: ${data.summary.conflicts}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Lỗi đồng bộ", description: err.message, variant: "destructive" });
    },
  });

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((t) => t !== tableId) : [...prev, tableId]
    );
  };

  const toggleAll = () => {
    setSelectedTables((prev) =>
      prev.length === SYNCABLE_TABLES.length ? [] : SYNCABLE_TABLES.map((t) => t.id)
    );
  };

  const directionIcon = {
    push: <ArrowUp className="h-4 w-4" />,
    pull: <ArrowDown className="h-4 w-4" />,
    both: <ArrowUpDown className="h-4 w-4" />,
  };

  const directionLabel = {
    push: "Push (Local → External)",
    pull: "Pull (External → Local)",
    both: "Cả hai chiều",
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Hoàn tất</Badge>;
      case "running":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Đang chạy</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Một phần</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Lỗi</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Đồng bộ Database</h1>
          <p className="text-muted-foreground mt-1">
            Đồng bộ dữ liệu giữa Lovable Cloud và Supabase bên ngoài
          </p>
        </div>

        {/* Schema Setup Card */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-5 w-5" />
              Khởi tạo Schema bên ngoài
            </CardTitle>
            <CardDescription>
              Tạo tất cả enum types và bảng trên Supabase bên ngoài. Cần cấu hình secret{" "}
              <code>EXTERNAL_SUPABASE_DB_URL</code> (PostgreSQL connection string).
              Chạy lần đầu hoặc khi thêm bảng mới.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              variant="outline"
              size="lg"
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <ServerCog className="h-4 w-4" />
                  Khởi tạo Database
                </>
              )}
            </Button>

            {setupResults && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                {setupResults.map((r) => (
                  <div
                    key={r.table}
                    className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                      r.status === "ok"
                        ? "bg-green-500/10 text-green-700"
                        : "bg-red-500/10 text-red-700"
                    }`}
                  >
                    {r.status === "ok" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {r.table}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Configuration */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Chọn bảng đồng bộ
              </CardTitle>
              <CardDescription>
                Chọn các bảng cần đồng bộ. Secrets <code>EXTERNAL_SUPABASE_URL</code> và{" "}
                <code>EXTERNAL_SUPABASE_SERVICE_KEY</code> cần được cấu hình trước.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedTables.length === SYNCABLE_TABLES.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SYNCABLE_TABLES.map((table) => (
                  <label
                    key={table.id}
                    className="flex items-start gap-2 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.id)}
                      onCheckedChange={() => toggleTable(table.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{table.label}</div>
                      <div className="text-xs text-muted-foreground">{table.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chạy đồng bộ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Hướng đồng bộ</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">
                      <span className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4" /> Push (Local → External)
                      </span>
                    </SelectItem>
                    <SelectItem value="pull">
                      <span className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" /> Pull (External → Local)
                      </span>
                    </SelectItem>
                    <SelectItem value="both">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" /> Cả hai chiều
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="font-medium mb-1">Đã chọn: {selectedTables.length} bảng</p>
                <p className="text-muted-foreground">
                  {direction === "push" && "Dữ liệu từ Lovable Cloud sẽ được đẩy sang Supabase ngoài"}
                  {direction === "pull" && "Dữ liệu từ Supabase ngoài sẽ được kéo về Lovable Cloud"}
                  {direction === "both" && "Đồng bộ 2 chiều, bản mới hơn (updated_at) sẽ được giữ"}
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || selectedTables.length === 0}
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đồng bộ...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Chạy đồng bộ
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử đồng bộ</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !syncLogs?.length ? (
              <p className="text-center text-muted-foreground py-8">Chưa có lần đồng bộ nào</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Hướng</TableHead>
                    <TableHead>Bảng</TableHead>
                    <TableHead className="text-right">Pushed</TableHead>
                    <TableHead className="text-right">Pulled</TableHead>
                    <TableHead className="text-right">Conflicts</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.started_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          {directionIcon[log.direction as keyof typeof directionIcon]}
                          {directionLabel[log.direction as keyof typeof directionLabel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.tables_synced?.length || 0} bảng
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{log.rows_pushed}</TableCell>
                      <TableCell className="text-right font-mono">{log.rows_pulled}</TableCell>
                      <TableCell className="text-right font-mono">{log.conflicts}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
