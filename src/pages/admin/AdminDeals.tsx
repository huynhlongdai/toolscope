import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Tag, Eye, MousePointer } from "lucide-react";

export default function AdminDeals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editDeal, setEditDeal] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-deals", statusFilter],
    queryFn: async () => {
      let q = (supabase.from("deals") as any)
        .select("*, tools(name, slug)")
        .order("created_at", { ascending: false });
      if (statusFilter === "active") q = q.eq("is_active", true);
      else if (statusFilter === "inactive") q = q.eq("is_active", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("deals") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast.success("Đã xóa deal");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase.from("deals") as any).update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
    },
  });

  const filtered = deals.filter((d: any) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.tools?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalClicks = deals.reduce((sum: number, d: any) => sum + (d.click_count || 0), 0);
  const activeCount = deals.filter((d: any) => d.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Ưu đãi</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Thêm Deal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl md:text-2xl font-bold">{deals.length}</p>
            <p className="text-xs text-muted-foreground">Tổng deals</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-primary">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl md:text-2xl font-bold">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Tổng clicks</p>
          </CardContent></Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Đang hoạt động</SelectItem>
              <SelectItem value="inactive">Đã tắt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Giảm giá</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có deal nào</TableCell></TableRow>
              ) : filtered.map((deal: any) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      {deal.is_exclusive && <Badge variant="outline" className="text-[10px]">Độc quyền</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{deal.tools?.name ?? "—"}</TableCell>
                  <TableCell>
                    {deal.discount_type === "percentage" && deal.discount_value
                      ? <Badge variant="destructive">-{deal.discount_value}%</Badge>
                      : deal.discount_type === "fixed" && deal.discount_value
                      ? <Badge variant="destructive">-{deal.discount_value} {deal.currency}</Badge>
                      : <Badge variant="secondary">{deal.discount_type}</Badge>
                    }
                  </TableCell>
                  <TableCell className="font-mono text-xs">{deal.coupon_code || "—"}</TableCell>
                  <TableCell>{deal.click_count}</TableCell>
                  <TableCell>
                    <Switch
                      checked={deal.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: deal.id, active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditDeal(deal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa deal này?")) deleteMutation.mutate(deal.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {(editDeal || showAdd) && (
          <DealFormDialog
            deal={editDeal}
            open={!!editDeal || showAdd}
            onClose={() => { setEditDeal(null); setShowAdd(false); queryClient.invalidateQueries({ queryKey: ["admin-deals"] }); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function DealFormDialog({ deal, open, onClose }: { deal: any; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tool_id: deal?.tool_id ?? "",
    title: deal?.title ?? "",
    description: deal?.description ?? "",
    coupon_code: deal?.coupon_code ?? "",
    discount_type: deal?.discount_type ?? "percentage",
    discount_value: deal?.discount_value ?? "",
    deal_url: deal?.deal_url ?? "",
    original_price: deal?.original_price ?? "",
    deal_price: deal?.deal_price ?? "",
    currency: deal?.currency ?? "USD",
    starts_at: deal?.starts_at ? new Date(deal.starts_at).toISOString().slice(0, 16) : "",
    expires_at: deal?.expires_at ? new Date(deal.expires_at).toISOString().slice(0, 16) : "",
    is_verified: deal?.is_verified ?? false,
    is_exclusive: deal?.is_exclusive ?? false,
    is_active: deal?.is_active ?? true,
  });

  const [toolSearch, setToolSearch] = useState("");
  const { data: toolResults = [] } = useQuery({
    queryKey: ["tools-search-deals", toolSearch],
    queryFn: async () => {
      if (!toolSearch) return [];
      const { data } = await supabase.from("tools").select("id, name").ilike("name", `%${toolSearch}%`).limit(10);
      return data ?? [];
    },
    enabled: toolSearch.length > 1,
  });

  const { data: selectedTool } = useQuery({
    queryKey: ["tool-name", form.tool_id],
    queryFn: async () => {
      if (!form.tool_id) return null;
      const { data } = await supabase.from("tools").select("name").eq("id", form.tool_id).single();
      return data;
    },
    enabled: !!form.tool_id,
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title || !form.tool_id) { toast.error("Tiêu đề và tool là bắt buộc"); return; }
    setSaving(true);
    const payload: any = {
      tool_id: form.tool_id,
      title: form.title,
      description: form.description || null,
      coupon_code: form.coupon_code || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
      deal_url: form.deal_url || null,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      deal_price: form.deal_price ? parseFloat(form.deal_price) : null,
      currency: form.currency,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_verified: form.is_verified,
      is_exclusive: form.is_exclusive,
      is_active: form.is_active,
    };

    if (deal) {
      const { error } = await (supabase.from("deals") as any).update(payload).eq("id", deal.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      payload.created_by = user?.id;
      const { error } = await (supabase.from("deals") as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success(deal ? "Đã cập nhật deal" : "Đã tạo deal");
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? "Chỉnh sửa Deal" : "Thêm Deal mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Tool selector */}
          <div>
            <Label>Tool *</Label>
            {selectedTool ? (
              <div className="flex items-center gap-2 mt-1">
                <Badge>{selectedTool.name}</Badge>
                <Button variant="ghost" size="sm" onClick={() => update("tool_id", "")}>Đổi</Button>
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                <Input placeholder="Tìm tool..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} />
                {toolResults.length > 0 && (
                  <div className="border rounded-md max-h-32 overflow-y-auto">
                    {toolResults.map((t: any) => (
                      <button key={t.id} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => { update("tool_id", t.id); setToolSearch(""); }}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Giảm 50% gói Pro" />
            </div>
            <div>
              <Label>Mã giảm giá</Label>
              <Input value={form.coupon_code} onChange={(e) => update("coupon_code", e.target.value)} placeholder="SAVE50" className="font-mono" />
            </div>
          </div>

          <div>
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Chi tiết ưu đãi..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Loại giảm giá</Label>
              <Select value={form.discount_type} onValueChange={(v) => update("discount_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                  <SelectItem value="fixed">Số tiền cố định</SelectItem>
                  <SelectItem value="free_trial">Dùng thử miễn phí</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Giá trị giảm</Label>
              <Input type="number" value={form.discount_value} onChange={(e) => update("discount_value", e.target.value)} placeholder="50" />
            </div>
            <div>
              <Label>Đơn vị tiền</Label>
              <Input value={form.currency} onChange={(e) => update("currency", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giá gốc</Label>
              <Input type="number" value={form.original_price} onChange={(e) => update("original_price", e.target.value)} />
            </div>
            <div>
              <Label>Giá deal</Label>
              <Input type="number" value={form.deal_price} onChange={(e) => update("deal_price", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Link ưu đãi</Label>
            <Input value={form.deal_url} onChange={(e) => update("deal_url", e.target.value)} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bắt đầu</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => update("starts_at", e.target.value)} />
            </div>
            <div>
              <Label>Hết hạn</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => update("expires_at", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_verified} onCheckedChange={(v) => update("is_verified", v)} />
              <Label>Đã xác minh</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_exclusive} onCheckedChange={(v) => update("is_exclusive", v)} />
              <Label>Độc quyền</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
              <Label>Hoạt động</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : deal ? "Cập nhật" : "Tạo Deal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
