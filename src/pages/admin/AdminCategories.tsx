import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown, Merge, Smile } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";

const EMOJI_LIST = ["🤖","🧠","💬","📝","🎨","🎬","📊","💼","🔧","📧","📱","🛒","🔍","🎯","📈","💰","🏥","📚","🎵","🔐","🌐","⚡","🚀","📦","🗂️","👤","📸","🎮","🧪","🔬"];

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [editCat, setEditCat] = useState<any>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

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

  // Tool counts per category
  const { data: toolCounts = {} } = useQuery({
    queryKey: ["admin-category-tool-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("category_id");
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((t: any) => { if (t.category_id) counts[t.category_id] = (counts[t.category_id] || 0) + 1; });
      return counts;
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

  const moveCategory = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = categories.findIndex((c: any) => c.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= categories.length) return;
      const current = categories[idx] as any;
      const swap = categories[swapIdx] as any;
      await Promise.all([
        supabase.from("categories").update({ sort_order: swap.sort_order }).eq("id", current.id),
        supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const mergeCategories = useMutation({
    mutationFn: async () => {
      if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) throw new Error("Invalid");
      // Move all tools from source to target
      const { error: updateErr } = await supabase.from("tools").update({ category_id: mergeTarget }).eq("category_id", mergeSource);
      if (updateErr) throw updateErr;
      // Move sub-categories
      const { error: subErr } = await supabase.from("categories").update({ parent_id: mergeTarget }).eq("parent_id", mergeSource);
      if (subErr) throw subErr;
      // Delete source
      const { error: delErr } = await supabase.from("categories").delete().eq("id", mergeSource);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-tool-counts"] });
      logAuditAction("category_merge", "category", mergeTarget, { source: mergeSource });
      toast.success("Đã gộp danh mục");
      setShowMerge(false);
      setMergeSource(""); setMergeTarget("");
    },
    onError: (e: any) => toast.error(e.message),
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

  const bulkDeleteTags = async () => {
    const ids = Array.from(selectedTags);
    if (!ids.length || !confirm(`Xóa ${ids.length} tags?`)) return;
    for (const id of ids) await supabase.from("tags").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
    setSelectedTags(new Set());
    toast.success(`Đã xóa ${ids.length} tags`);
  };

  const toggleTag = (id: string) => {
    setSelectedTags(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { setEditCat(null); setShowAddCat(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm danh mục</Button>
              <Button size="sm" variant="outline" onClick={() => setShowMerge(true)}><Merge className="mr-1 h-3.5 w-3.5" /> Gộp danh mục</Button>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Tools</TableHead>
                    <TableHead>Thứ tự</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c: any, idx: number) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.slug}</TableCell>
                      <TableCell className="text-lg">{c.icon ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.parent_id ? categories.find((p: any) => p.id === c.parent_id)?.name || "—" : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(toolCounts as any)[c.id] || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm w-6 text-center">{c.sort_order}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveCategory.mutate({ id: c.id, direction: "up" })}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === categories.length - 1} onClick={() => moveCategory.mutate({ id: c.id, direction: "down" })}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowAddTag(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm tag</Button>
              {selectedTags.size > 0 && (
                <Button size="sm" variant="destructive" onClick={bulkDeleteTags}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa {selectedTags.size} tags</Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t: any) => (
                <div key={t.id} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${selectedTags.has(t.id) ? "bg-primary/10 border-primary" : ""}`} onClick={() => toggleTag(t.id)}>
                  <Checkbox checked={selectedTags.has(t.id)} className="h-3 w-3" onCheckedChange={() => toggleTag(t.id)} />
                  {t.name}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Xóa?")) deleteTag.mutate(t.id); }} className="ml-1 text-destructive hover:text-destructive/80">×</button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {showAddCat && (
          <CategoryFormDialog cat={editCat} categories={categories} open={showAddCat} onClose={() => { setShowAddCat(false); setEditCat(null); }} />
        )}

        {/* Add tag dialog */}
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

        {/* Merge dialog */}
        <Dialog open={showMerge} onOpenChange={setShowMerge}>
          <DialogContent>
            <DialogHeader><DialogTitle>Gộp danh mục</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tất cả tools và sub-categories từ danh mục nguồn sẽ được chuyển sang danh mục đích, sau đó danh mục nguồn sẽ bị xóa.</p>
              <div className="space-y-2">
                <Label>Danh mục nguồn (sẽ bị xóa)</Label>
                <Select value={mergeSource} onValueChange={setMergeSource}>
                  <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name} ({(toolCounts as any)[c.id] || 0} tools)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Danh mục đích (giữ lại)</Label>
                <Select value={mergeTarget} onValueChange={setMergeTarget}>
                  <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c: any) => c.id !== mergeSource).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowMerge(false)}>Hủy</Button>
                <Button variant="destructive" onClick={() => mergeCategories.mutate()} disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget || mergeCategories.isPending}>
                  {mergeCategories.isPending ? "Đang gộp..." : "Gộp"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ---------- Category Form Dialog with Emoji Picker ---------- */
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
      name: form.name, slug: form.slug, icon: form.icon || null,
      description: form.description || null, parent_id: form.parent_id || null,
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
              <Label>Icon</Label>
              <div className="flex gap-2">
                <Input value={form.icon} onChange={(e) => update("icon", e.target.value)} placeholder="🤖" className="flex-1" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon"><Smile className="h-4 w-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJI_LIST.map(e => (
                        <button key={e} className="text-xl p-1 rounded hover:bg-muted transition-colors" onClick={() => update("icon", e)}>{e}</button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
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
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
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
