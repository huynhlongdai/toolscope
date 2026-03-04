import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tool = Tables<"tools">;

export default function AdminTools() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["admin-tools", statusFilter],
    queryFn: async () => {
      let q = supabase.from("tools").select("*, categories(name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      toast.success("Đã xóa tool");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tools").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const filtered = tools.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "default";
      case "draft": return "secondary";
      case "pending_review": return "outline";
      case "archived": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Tools</h1>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" /> Thêm Tool
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_review">Pending</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có tool nào</TableCell></TableRow>
              ) : (
                filtered.map((tool: any) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {tool.logo_url && <img src={tool.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />}
                        <div>
                          <p className="font-medium">{tool.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tool.short_description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{(tool as any).categories?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={tool.status} onValueChange={(v) => updateStatusMutation.mutate({ id: tool.id, status: v })}>
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={statusColor(tool.status) as any} className="text-xs">{tool.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_review">Pending</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="outline">{tool.pricing_type}</Badge></TableCell>
                    <TableCell>{tool.avg_rating ? `${Number(tool.avg_rating).toFixed(1)} ⭐` : "—"}</TableCell>
                    <TableCell>{tool.view_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tool.website_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={tool.website_url} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setEditTool(tool)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa tool này?")) deleteMutation.mutate(tool.id); }}>
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

        {(editTool || showAdd) && (
          <ToolFormDialog
            tool={editTool}
            open={!!editTool || showAdd}
            onClose={() => { setEditTool(null); setShowAdd(false); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ToolFormDialog({ tool, open, onClose }: { tool: Tool | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(tool?.name ?? "");
  const [slug, setSlug] = useState(tool?.slug ?? "");
  const [description, setDescription] = useState(tool?.description ?? "");
  const [shortDesc, setShortDesc] = useState(tool?.short_description ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(tool?.website_url ?? "");
  const [logoUrl, setLogoUrl] = useState(tool?.logo_url ?? "");
  const [pricingType, setPricingType] = useState<string>(tool?.pricing_type ?? "free");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !slug) { toast.error("Tên và slug là bắt buộc"); return; }
    setSaving(true);
    const payload = {
      name, slug, description, short_description: shortDesc,
      website_url: websiteUrl || null, logo_url: logoUrl || null,
      pricing_type: pricingType as any,
    };

    if (tool) {
      const { error } = await supabase.from("tools").update(payload).eq("id", tool.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật tool");
    } else {
      const { error } = await supabase.from("tools").insert({ ...payload, status: "published" as any });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã thêm tool");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Chỉnh sửa Tool" : "Thêm Tool mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên *</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!tool) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mô tả ngắn</Label>
            <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mô tả chi tiết</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pricing</Label>
            <Select value={pricingType} onValueChange={setPricingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="freemium">Freemium</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open_source">Open Source</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
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
