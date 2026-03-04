import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
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

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({ name: catName, slug: catSlug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Đã thêm danh mục");
      setCatName(""); setCatSlug(""); setShowAddCat(false);
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Categories & Tags</h1>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Danh mục ({categories.length})</TabsTrigger>
            <TabsTrigger value="tags">Tags ({tags.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-4">
            <Button onClick={() => setShowAddCat(true)}><Plus className="mr-2 h-4 w-4" /> Thêm danh mục</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Thứ tự</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                      <TableCell>{c.icon ?? "—"}</TableCell>
                      <TableCell>{c.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deleteCategory.mutate(c.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

        <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm danh mục</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Tên</Label><Input value={catName} onChange={(e) => { setCatName(e.target.value); setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} /></div>
              <Button onClick={() => addCategory.mutate()} disabled={!catName || !catSlug}>Thêm</Button>
            </div>
          </DialogContent>
        </Dialog>

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
