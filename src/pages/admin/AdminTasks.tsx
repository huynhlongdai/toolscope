import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ListChecks, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [editTask, setEditTask] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", icon: "🔧", description: "", sort_order: 0 });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: tools } = useQuery({
    queryKey: ["all-tools-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, name")
        .eq("status", "published")
        .order("name")
        .limit(500);
      return data || [];
    },
  });

  const { data: taskTools } = useQuery({
    queryKey: ["task-tools", assignOpen],
    queryFn: async () => {
      const { data } = await supabase
        .from("tool_tasks")
        .select("*, tools(name)")
        .eq("task_id", assignOpen!);
      return data || [];
    },
    enabled: !!assignOpen,
  });

  const openCreate = () => {
    setEditTask(null);
    setForm({ name: "", slug: "", icon: "🔧", description: "", sort_order: 0 });
    setFormOpen(true);
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setForm({
      name: task.name,
      slug: task.slug,
      icon: task.icon || "🔧",
      description: task.description || "",
      sort_order: task.sort_order || 0,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Cần nhập tên và slug"); return; }
    try {
      if (editTask) {
        const { error } = await supabase.from("tasks").update(form).eq("id", editTask.id);
        if (error) throw error;
        toast.success("Đã cập nhật task");
      } else {
        const { error } = await supabase.from("tasks").insert(form);
        if (error) throw error;
        toast.success("Đã tạo task mới");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa task này?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa"); return; }
    toast.success("Đã xóa");
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
  };

  const assignTool = async () => {
    if (!assignOpen || !selectedToolId) return;
    const { error } = await supabase.from("tool_tasks").insert({
      task_id: assignOpen,
      tool_id: selectedToolId,
      relevance_score: 50,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Đã gán tool");
    setSelectedToolId("");
    queryClient.invalidateQueries({ queryKey: ["task-tools", assignOpen] });
  };

  const removeTool = async (id: string) => {
    await supabase.from("tool_tasks").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["task-tools", assignOpen] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListChecks className="h-6 w-6" /> Quản lý Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">CRUD tasks và gán tools vào từng task</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm Task
          </Button>
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
                  <TableHead>Icon</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks?.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-xl">{task.icon}</TableCell>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{task.slug}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{task.tool_count || 0}</Badge>
                    </TableCell>
                    <TableCell>{task.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setAssignOpen(task.id)}>
                          <Link2 className="h-3 w-3" /> Gán Tools
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => openEdit(task)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có task nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editTask ? "Sửa Task" : "Thêm Task mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Icon</label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                </div>
                <div className="col-span-3">
                  <label className="mb-1 block text-sm font-medium">Tên *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Generate images" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Slug *</label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="generate-images" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Thứ tự</label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mô tả</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editTask ? "Cập nhật" : "Tạo Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Tools Dialog */}
        <Dialog open={!!assignOpen} onOpenChange={(v) => !v && setAssignOpen(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gán Tools vào Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tools?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={assignTool} disabled={!selectedToolId}>Thêm</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-auto">
                {taskTools?.map((tt) => (
                  <div key={tt.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{(tt.tools as any)?.name}</span>
                    <Button size="sm" variant="ghost" className="h-6" onClick={() => removeTool(tt.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {taskTools?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa gán tool nào</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
