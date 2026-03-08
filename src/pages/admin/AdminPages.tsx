import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Copy } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminPages() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [newTitle, setNewTitle] = useState("");

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["admin-pages", statusFilter],
    queryFn: async () => {
      let q = supabase.from("pages").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      logAuditAction("page_delete", "page", id);
      toast.success("Đã xóa trang");
    },
  });

  const createPage = async () => {
    if (!newTitle.trim()) { toast.error("Nhập tiêu đề"); return; }
    const slug = newTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { data, error } = await supabase.from("pages").insert({ title: newTitle, slug, blocks: [], status: "draft" as any }).select().single();
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    logAuditAction("page_create", "page", data.id);
    setShowCreate(false);
    setNewTitle("");
    navigate(`/admin/pages/${data.id}`);
  };

  const duplicatePage = async (page: any) => {
    const { data, error } = await supabase.from("pages").insert({
      title: `${page.title} (Copy)`,
      slug: `${page.slug}-copy-${Date.now()}`,
      blocks: page.blocks,
      status: "draft" as any,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      template: page.template,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    logAuditAction("page_duplicate", "page", data.id, { source: page.id });
    toast.success("Đã nhân bản trang");
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Page Builder</h1>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Tạo trang</Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : pages.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có trang nào</TableCell></TableRow>
              ) : (
                pages.map((page: any) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">/p/{page.slug}</TableCell>
                    <TableCell>
                      <Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{page.template || "blank"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {page.updated_at ? new Date(page.updated_at).toLocaleDateString("vi-VN") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(page.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/p/${page.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => duplicatePage(page)} title="Nhân bản">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/pages/${page.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa trang này?")) deleteMutation.mutate(page.id); }}>
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
      </div>

      {/* Create page dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo trang mới</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề trang *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ví dụ: Giới thiệu, Liên hệ..." onKeyDown={(e) => e.key === "Enter" && createPage()} autoFocus />
            </div>
            {newTitle && (
              <p className="text-xs text-muted-foreground">
                Slug: /p/{newTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setNewTitle(""); }}>Hủy</Button>
              <Button onClick={createPage} disabled={!newTitle.trim()}>Tạo & chỉnh sửa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
