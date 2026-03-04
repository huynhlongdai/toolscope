import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Workflow, GripVertical, X } from "lucide-react";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";

export default function AdminWorkflows() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editWf, setEditWf] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflows").select("*, profiles(display_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-workflows"] }); toast.success("Đã xóa"); },
  });

  const filtered = workflows.filter((w: any) => w.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Workflows</h1>
          <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Tạo Workflow</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có workflow</TableCell></TableRow>
              ) : (
                filtered.map((wf: any) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">{wf.title}</TableCell>
                    <TableCell>{wf.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={wf.status === "published" ? "default" : "secondary"} className="text-xs">{wf.status}</Badge>
                    </TableCell>
                    <TableCell>{wf.tool_ids?.length || 0}</TableCell>
                    <TableCell>{(wf.steps as any[])?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditWf(wf)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deleteMut.mutate(wf.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {(editWf || showAdd) && (
          <WorkflowFormDialog wf={editWf} open={!!editWf || showAdd} onClose={() => { setEditWf(null); setShowAdd(false); }} userId={user?.id} />
        )}
      </div>
    </AdminLayout>
  );
}

function WorkflowFormDialog({ wf, open, onClose, userId }: { wf: any; open: boolean; onClose: () => void; userId?: string }) {
  const queryClient = useQueryClient();
  const isNew = !wf?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: wf?.title ?? "",
    slug: wf?.slug ?? "",
    description: wf?.description ?? "",
    category: wf?.category ?? "",
    cover_image_url: wf?.cover_image_url ?? "",
    status: wf?.status ?? "draft",
    tool_ids: (wf?.tool_ids as string[]) ?? [],
    steps: ((wf?.steps as any[]) ?? [{ title: "", description: "", tool_id: null }]),
  });

  const { data: allTools = [] } = useQuery({
    queryKey: ["all-tools-wf"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const [toolSearch, setToolSearch] = useState("");
  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addStep = () => update("steps", [...form.steps, { title: "", description: "", tool_id: null }]);
  const removeStep = (i: number) => update("steps", form.steps.filter((_: any, idx: number) => idx !== i));
  const updateStep = (i: number, key: string, value: any) => {
    const s = [...form.steps];
    s[i] = { ...s[i], [key]: value };
    update("steps", s);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error("Tiêu đề và slug là bắt buộc"); return; }
    if (!userId) { toast.error("Cần đăng nhập"); return; }
    setSaving(true);

    const payload: any = {
      title: form.title, slug: form.slug, description: form.description || null,
      category: form.category || null, cover_image_url: form.cover_image_url || null,
      status: form.status as any,
      tool_ids: form.tool_ids.length > 0 ? form.tool_ids : [],
      steps: form.steps.filter((s: any) => s.title),
    };

    if (isNew) {
      const { error } = await supabase.from("workflows").insert({ ...payload, author_id: userId });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã tạo workflow");
    } else {
      const { error } = await supabase.from("workflows").update(payload).eq("id", wf.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Tạo Workflow mới" : "Chỉnh sửa Workflow"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input value={form.title} onChange={(e) => { update("title", e.target.value); if (isNew) update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="VD: Design, Marketing..." />
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image_url} onChange={(e) => update("cover_image_url", e.target.value)} />
            </div>
          </div>

          {/* Tools */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h3 className="font-semibold text-sm">🔗 Tools trong Workflow</h3>
            <Input placeholder="Tìm tool..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="h-8" />
            {toolSearch && (
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2 bg-background">
                {allTools.filter((t: any) => t.name.toLowerCase().includes(toolSearch.toLowerCase()) && !form.tool_ids.includes(t.id)).slice(0, 8).map((t: any) => (
                  <button key={t.id} type="button" className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-muted text-sm" onClick={() => { update("tool_ids", [...form.tool_ids, t.id]); setToolSearch(""); }}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {form.tool_ids.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tool_ids.map((id: string) => {
                  const tool = allTools.find((t: any) => t.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {tool?.name || id.slice(0, 8)}
                      <button type="button" className="ml-1 hover:text-destructive" onClick={() => update("tool_ids", form.tool_ids.filter((x: string) => x !== id))}>×</button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">📋 Các bước thực hiện</h3>
              <Button variant="outline" size="sm" onClick={addStep}><Plus className="mr-1 h-3 w-3" /> Thêm bước</Button>
            </div>
            {form.steps.map((step: any, i: number) => (
              <div key={i} className="border rounded p-3 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Bước {i + 1}</span>
                  {form.steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-destructive hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>
                <Input placeholder="Tiêu đề bước" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} className="h-8" />
                <Textarea placeholder="Mô tả chi tiết..." value={step.description} onChange={(e) => updateStep(i, "description", e.target.value)} rows={2} className="text-sm" />
                <Select value={step.tool_id || "__none"} onValueChange={(v) => updateStep(i, "tool_id", v === "__none" ? null : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn tool (tùy chọn)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Không chọn tool</SelectItem>
                    {allTools.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
