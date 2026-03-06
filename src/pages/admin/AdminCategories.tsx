import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Sparkles, RefreshCw } from "lucide-react";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [editCat, setEditCat] = useState<any>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      return data ?? [];
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Đã xóa");
    },
  });

  const addTag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tags").insert({ name: tagName, slug: tagSlug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Đã thêm tag");
      setTagName(""); setTagSlug(""); setShowAddTag(false);
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Đã xóa tag");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categories & Tags</h1>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Danh mục ({categories.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags ({tags.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-4">
            <Button size="sm" onClick={() => { setEditCat(null); setShowAddCat(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm danh mục</Button>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Thứ tự</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                      <TableCell>{c.icon ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.parent_id ? categories.find((p: any) => p.id === c.parent_id)?.name || "—" : "—"}
                      </TableCell>
                      <TableCell>{c.sort_order}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">{c.description || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditCat(c); setShowAddCat(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deleteCategory.mutate(c.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="tags" className="mt-4 space-y-4">
            <Button onClick={() => setShowAddTag(true)}><Plus className="mr-2 h-4 w-4" /> Thêm tag</Button>
            <div className="flex flex-wrap gap-2">
              {tags.map((t: any) => (
                <div key={t.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                  {t.name}
                  <button onClick={() => { if (confirm("Xóa?")) deleteTag.mutate(t.id); }} className="ml-1 text-destructive hover:text-destructive/80">×</button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {showAddCat && (
          <CategoryFormDialog cat={editCat} categories={categories} open={showAddCat} onClose={() => { setShowAddCat(false); setEditCat(null); }} />
        )}

        <Dialog open={showAddTag} onOpenChange={setShowAddTag}>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm tag</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Tên</Label><Input value={tagName} onChange={(e) => { setTagName(e.target.value); setTagSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={tagSlug} onChange={(e) => setTagSlug(e.target.value)} /></div>
              <Button onClick={() => addTag.mutate()} disabled={!tagName || !tagSlug}>Thêm</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ---------- Category Form Dialog ---------- */
function CategoryFormDialog({ cat, categories, open, onClose }: { cat: any; categories: any[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isNew = !cat?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: cat?.name ?? "",
    slug: cat?.slug ?? "",
    icon: cat?.icon ?? "",
    description: cat?.description ?? "",
    parent_id: cat?.parent_id ?? "",
    sort_order: cat?.sort_order ?? 0,
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Tên và slug là bắt buộc"); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      icon: form.icon || null,
      description: form.description || null,
      parent_id: form.parent_id || null,
      sort_order: Number(form.sort_order) || 0,
    };

    if (isNew) {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã thêm danh mục");
    } else {
      const { error } = await supabase.from("categories").update(payload).eq("id", cat.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật danh mục");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "Thêm danh mục" : "Chỉnh sửa danh mục"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên *</Label>
              <Input value={form.name} onChange={(e) => { update("name", e.target.value); if (isNew) update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon (emoji/tên)</Label>
              <Input value={form.icon} onChange={(e) => update("icon", e.target.value)} placeholder="🤖 hoặc brain-circuit" />
            </div>
            <div className="space-y-2">
              <Label>Thứ tự sắp xếp</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Danh mục cha</Label>
            <Select value={form.parent_id || "__none"} onValueChange={(v) => update("parent_id", v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Không có" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Không có (Root)</SelectItem>
                {categories.filter((c: any) => c.id !== cat?.id).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
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
