import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/export";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, ListChecks, Link2, Sparkles, ChevronUp, ChevronDown,
  Loader2, Star, Download, Merge, Search, Lightbulb, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminTasks() {
  const queryClient = useQueryClient();
  const [editTask, setEditTask] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [selectedToolId, setSelectedToolId] = useState("");
  const [bulkTaskId, setBulkTaskId] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFeatured, setFilterFeatured] = useState<string>("all");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", slug: "", icon: "🔧", description: "", sort_order: 0, parent_id: "", is_featured: false, color: "" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["all-tools-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name, description").eq("status", "published").order("name").limit(500);
      return data || [];
    },
  });

  const { data: taskTools = [] } = useQuery({
    queryKey: ["task-tools", assignOpen],
    queryFn: async () => {
      const { data } = await supabase.from("tool_tasks").select("*, tools(name)").eq("task_id", assignOpen!);
      return data || [];
    },
    enabled: !!assignOpen,
  });

  const { data: toolCounts = {} } = useQuery({
    queryKey: ["task-tool-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("tool_tasks").select("task_id");
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((t: any) => { counts[t.task_id] = (counts[t.task_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: suggestions = [], isLoading: sugLoading } = useQuery({
    queryKey: ["task-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_suggestions" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const pendingSuggestions = suggestions.filter((s: any) => s.status === "pending");

  // Stats
  const totalMappings = useMemo(() => Object.values(toolCounts).reduce((a: number, b: any) => a + b, 0), [toolCounts]);
  const tasksWithoutTools = useMemo(() => tasks.filter((t: any) => !(toolCounts as any)[t.id]).length, [tasks, toolCounts]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterFeatured === "featured" && !t.is_featured) return false;
      if (filterFeatured === "no_tools" && (toolCounts as any)[t.id]) return false;
      return true;
    });
  }, [tasks, searchQuery, filterFeatured, toolCounts]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ name: "", slug: "", icon: "🔧", description: "", sort_order: 0, parent_id: "", is_featured: false, color: "" });
    setFormOpen(true);
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setForm({
      name: task.name, slug: task.slug, icon: task.icon || "🔧",
      description: task.description || "", sort_order: task.sort_order || 0,
      parent_id: task.parent_id || "", is_featured: task.is_featured || false, color: task.color || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Cần nhập tên và slug"); return; }
    const payload: any = {
      name: form.name, slug: form.slug, icon: form.icon,
      description: form.description, sort_order: form.sort_order,
      parent_id: form.parent_id || null, is_featured: form.is_featured, color: form.color || null,
    };
    try {
      if (editTask) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id);
        if (error) throw error;
        toast.success("Đã cập nhật task");
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
        toast.success("Đã tạo task mới");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa task này?")) return;
    await supabase.from("tool_tasks").delete().eq("task_id", id);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa"); return; }
    toast.success("Đã xóa");
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const bulkDelete = async () => {
    if (bulkDeleteIds.size === 0) return;
    if (!confirm(`Xóa ${bulkDeleteIds.size} tasks?`)) return;
    for (const id of bulkDeleteIds) {
      await supabase.from("tool_tasks").delete().eq("task_id", id);
      await supabase.from("tasks").delete().eq("id", id);
    }
    toast.success(`Đã xóa ${bulkDeleteIds.size} tasks`);
    setBulkDeleteIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const toggleFeatured = async (task: any) => {
    const { error } = await supabase.from("tasks").update({ is_featured: !task.is_featured }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
  };

  const moveTask = async (id: string, direction: "up" | "down") => {
    const idx = tasks.findIndex((t: any) => t.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tasks.length) return;
    const current = tasks[idx];
    const swap = tasks[swapIdx];
    await Promise.all([
      supabase.from("tasks").update({ sort_order: swap.sort_order }).eq("id", current.id),
      supabase.from("tasks").update({ sort_order: current.sort_order }).eq("id", swap.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
  };

  const assignTool = async () => {
    if (!assignOpen || !selectedToolId) return;
    const { error } = await supabase.from("tool_tasks").insert({ task_id: assignOpen, tool_id: selectedToolId, relevance_score: 50 });
    if (error) { toast.error(error.message); return; }
    toast.success("Đã gán tool");
    setSelectedToolId("");
    queryClient.invalidateQueries({ queryKey: ["task-tools", assignOpen] });
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const removeTool = async (id: string) => {
    await supabase.from("tool_tasks").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["task-tools", assignOpen] });
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const bulkAssignTools = async () => {
    if (!bulkTaskId || selectedToolIds.size === 0) return;
    let added = 0;
    for (const toolId of selectedToolIds) {
      const { error } = await supabase.from("tool_tasks").insert({ task_id: bulkTaskId, tool_id: toolId, relevance_score: 50 });
      if (!error) added++;
    }
    logAuditAction("task_bulk_assign", "task", bulkTaskId, { count: added });
    toast.success(`Đã gán ${added} tools vào task`);
    setSelectedToolIds(new Set());
    setBulkAssignOpen(false);
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const mergeTasks = async () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) { toast.error("Chọn 2 task khác nhau"); return; }
    if (!confirm("Merge sẽ chuyển tất cả tool_tasks sang task đích và xóa task nguồn. Tiếp tục?")) return;
    // Move tool_tasks
    const { data: srcTools } = await supabase.from("tool_tasks").select("tool_id").eq("task_id", mergeSource);
    if (srcTools) {
      for (const st of srcTools) {
        await supabase.from("tool_tasks").upsert({ task_id: mergeTarget, tool_id: st.tool_id, relevance_score: 50 }, { onConflict: "task_id,tool_id" }).select();
      }
    }
    await supabase.from("tool_tasks").delete().eq("task_id", mergeSource);
    await supabase.from("tasks").delete().eq("id", mergeSource);
    logAuditAction("task_merge", "task", mergeTarget, { merged_from: mergeSource });
    toast.success("Đã merge tasks");
    setMergeOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
  };

  const aiSuggestTasks = async () => {
    setAiSuggesting(true);
    try {
      const { data: allToolTasks } = await supabase.from("tool_tasks").select("tool_id");
      const assignedIds = new Set(allToolTasks?.map((t: any) => t.tool_id) ?? []);
      const unassigned = tools.filter((t: any) => !assignedIds.has(t.id)).slice(0, 10);
      if (unassigned.length === 0) { toast.info("Tất cả tools đã được gán task"); return; }

      let suggestions = 0;
      for (const tool of unassigned) {
        const desc = (tool.description || tool.name).toLowerCase();
        for (const task of tasks) {
          const taskWords = task.name.toLowerCase().split(/\s+/);
          if (taskWords.some((w: string) => w.length > 3 && desc.includes(w))) {
            const { error } = await supabase.from("tool_tasks").insert({ task_id: task.id, tool_id: tool.id, relevance_score: 30 });
            if (!error) suggestions++;
            break;
          }
        }
      }
      logAuditAction("task_ai_suggest", "task", undefined, { suggestions });
      toast.success(`AI đã gợi ý gán ${suggestions} tools`);
      queryClient.invalidateQueries({ queryKey: ["task-tool-counts"] });
    } catch (e: any) { toast.error(e.message); } finally { setAiSuggesting(false); }
  };

  const approveSuggestion = async (s: any) => {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("tasks").insert({ name: s.name, slug, description: s.description || null, icon: "🔧", sort_order: tasks.length });
    if (error) { toast.error(error.message); return; }
    await supabase.from("task_suggestions" as any).update({ status: "approved" } as any).eq("id", s.id);
    toast.success("Đã duyệt và tạo task");
    queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task-suggestions"] });
  };

  const rejectSuggestion = async (id: string) => {
    await supabase.from("task_suggestions" as any).update({ status: "rejected" } as any).eq("id", id);
    toast.success("Đã từ chối");
    queryClient.invalidateQueries({ queryKey: ["task-suggestions"] });
  };

  const exportCSV = () => {
    const headers = ["Name", "Slug", "Icon", "Description", "Tool Count", "Featured"];
    const rows = tasks.map((t: any) => [t.name, t.slug, t.icon || "", t.description || "", String((toolCounts as any)[t.id] || 0), t.is_featured ? "Yes" : "No"]);
    exportToCSV(headers, rows, "tasks.csv");
  };

  const toggleToolSelect = (id: string) => setSelectedToolIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleBulkDelete = (id: string) => setBulkDeleteIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><ListChecks className="h-5 w-5 md:h-6 md:w-6" /> Quản lý Tasks</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">CRUD, gán tools, gợi ý AI, suggestions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" variant="outline" onClick={() => setMergeOpen(true)}><Merge className="mr-1 h-3.5 w-3.5" /> Merge</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkAssignOpen(true)}><Link2 className="mr-1 h-3.5 w-3.5" /> Bulk Assign</Button>
            <Button size="sm" variant="outline" onClick={aiSuggestTasks} disabled={aiSuggesting}>
              {aiSuggesting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />} AI Suggest
            </Button>
            <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm Task</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{tasks.length}</div><div className="text-xs text-muted-foreground">Tasks</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{totalMappings}</div><div className="text-xs text-muted-foreground">Mappings</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{tasksWithoutTools}</div><div className="text-xs text-muted-foreground">Chưa có tools</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{pendingSuggestions.length}</div><div className="text-xs text-muted-foreground">Đề xuất chờ</div></CardContent></Card>
        </div>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="suggestions">
              Đề xuất {pendingSuggestions.length > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{pendingSuggestions.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Tìm task..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
              <Select value={filterFeatured} onValueChange={setFilterFeatured}>
                <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="no_tools">Chưa có tools</SelectItem>
                </SelectContent>
              </Select>
              {bulkDeleteIds.size > 0 && (
                <Button size="sm" variant="destructive" onClick={bulkDelete} className="h-8">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa {bulkDeleteIds.size}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Tools</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Thứ tự</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task: any, idx: number) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Checkbox checked={bulkDeleteIds.has(task.id)} onCheckedChange={() => toggleBulkDelete(task.id)} />
                        </TableCell>
                        <TableCell className="text-xl">{task.icon}</TableCell>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{task.slug}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.parent_id ? tasks.find((t: any) => t.id === task.parent_id)?.name || "—" : "—"}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{(toolCounts as any)[task.id] || 0}</Badge></TableCell>
                        <TableCell>
                          <Switch checked={task.is_featured || false} onCheckedChange={() => toggleFeatured(task)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm w-6 text-center">{task.sort_order}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveTask(task.id, "up")}><ChevronUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === filteredTasks.length - 1} onClick={() => moveTask(task.id, "down")}><ChevronDown className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setAssignOpen(task.id)}><Link2 className="h-3 w-3" /> Gán</Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => openEdit(task)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" className="h-7" onClick={() => handleDelete(task.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTasks.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Không tìm thấy task nào</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {sugLoading ? (
              <Skeleton className="h-32" />
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="mx-auto h-8 w-8 mb-2 opacity-40" />
                Chưa có đề xuất nào
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <Badge variant={s.status === "pending" ? "default" : s.status === "approved" ? "secondary" : "destructive"} className="text-[10px]">
                          {s.status}
                        </Badge>
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(s.created_at).toLocaleDateString("vi")}</p>
                    </div>
                    {s.status === "pending" && (
                      <div className="flex gap-1.5 ml-3">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600" onClick={() => approveSuggestion(s)}>
                          <CheckCircle2 className="h-3 w-3" /> Duyệt
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive" onClick={() => rejectSuggestion(s.id)}>
                          <XCircle className="h-3 w-3" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editTask ? "Sửa Task" : "Thêm Task mới"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-4 gap-3">
                <div><label className="mb-1 block text-sm font-medium">Icon</label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
                <div className="col-span-3"><label className="mb-1 block text-sm font-medium">Tên *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Generate images" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-medium">Slug *</label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="generate-images" /></div>
                <div><label className="mb-1 block text-sm font-medium">Thứ tự</label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Parent Task</label>
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Không có" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không có</SelectItem>
                      {tasks.filter((t: any) => t.id !== editTask?.id).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Màu</label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#ff6b6b" />
                </div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">Mô tả</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <label className="text-sm font-medium">Featured</label>
              </div>
              <Button onClick={handleSave} className="w-full">{editTask ? "Cập nhật" : "Tạo Task"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Tools Dialog */}
        <Dialog open={!!assignOpen} onOpenChange={(v) => !v && setAssignOpen(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Gán Tools vào Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Chọn tool..." /></SelectTrigger>
                  <SelectContent>{tools.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={assignTool} disabled={!selectedToolId}>Thêm</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-auto">
                {taskTools.map((tt: any) => (
                  <div key={tt.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{(tt.tools as any)?.name}</span>
                    <Button size="sm" variant="ghost" className="h-6" onClick={() => removeTool(tt.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {taskTools.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa gán tool nào</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Dialog */}
        <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Bulk Assign Tools vào Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={bulkTaskId} onValueChange={setBulkTaskId}>
                <SelectTrigger><SelectValue placeholder="Chọn task đích..." /></SelectTrigger>
                <SelectContent>{tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="max-h-60 overflow-auto space-y-1 border rounded-md p-2">
                {tools.slice(0, 100).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleToolSelect(t.id)}>
                    <Checkbox checked={selectedToolIds.has(t.id)} />
                    <span className="text-sm">{t.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{selectedToolIds.size} tools đã chọn</span>
                <Button onClick={bulkAssignTools} disabled={!bulkTaskId || selectedToolIds.size === 0}>Gán {selectedToolIds.size} tools</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Merge Dialog */}
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Merge Tasks</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Chuyển tất cả tool mappings từ task nguồn sang task đích, sau đó xóa task nguồn.</p>
              <div>
                <label className="mb-1 block text-sm font-medium">Task nguồn (sẽ bị xóa)</label>
                <Select value={mergeSource} onValueChange={setMergeSource}>
                  <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>{tasks.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Task đích (giữ lại)</label>
                <Select value={mergeTarget} onValueChange={setMergeTarget}>
                  <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>{tasks.filter((t: any) => t.id !== mergeSource).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={mergeTasks} disabled={!mergeSource || !mergeTarget} variant="destructive" className="w-full">Merge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
