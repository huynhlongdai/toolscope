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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editPost, setEditPost] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*, profiles!blog_posts_author_id_fkey(display_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status: status as any };
      if (status === "published") update.published_at = new Date().toISOString();
      const { error } = await supabase.from("blog_posts").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-blog"] }); toast.success("Đã cập nhật"); },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-blog"] }); toast.success("Đã xóa"); },
  });

  const filtered = posts.filter((p: any) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Blog</h1>
          <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Tạo bài viết</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm bài viết..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có bài viết</TableCell></TableRow>
              ) : (
                filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">{p.title}</TableCell>
                    <TableCell>{p.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}>
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{p.view_count}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditPost(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deletePost.mutate(p.id); }}>
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

        {(editPost || showAdd) && (
          <BlogFormDialog post={editPost} open={!!editPost || showAdd} onClose={() => { setEditPost(null); setShowAdd(false); }} userId={user?.id} />
        )}
      </div>
    </AdminLayout>
  );
}

function BlogFormDialog({ post, open, onClose, userId }: { post: any; open: boolean; onClose: () => void; userId?: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    tags: (post?.tags ?? []).join(", "),
    content: post?.content ?? "",
    status: post?.status ?? "draft",
  });

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error("Tiêu đề và slug là bắt buộc"); return; }
    if (!userId) { toast.error("Cần đăng nhập"); return; }
    setSaving(true);

    const payload: any = {
      title: form.title, slug: form.slug, excerpt: form.excerpt || null,
      cover_image_url: form.cover_image_url || null,
      tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      content: form.content, status: form.status as any,
    };
    if (form.status === "published" && !post?.published_at) payload.published_at = new Date().toISOString();

    if (post) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật");
    } else {
      const { error } = await supabase.from("blog_posts").insert({ ...payload, author_id: userId });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã tạo bài viết");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{post ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input value={form.title} onChange={(e) => { updateField("title", e.target.value); if (!post) updateField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Excerpt</Label>
            <Input value={form.excerpt} onChange={(e) => updateField("excerpt", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image_url} onChange={(e) => updateField("cover_image_url", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags (phẩy phân cách)</Label>
              <Input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nội dung</Label>
            <RichTextEditor content={form.content} onChange={(v) => updateField("content", v)} placeholder="Viết nội dung bài blog..." />
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
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
