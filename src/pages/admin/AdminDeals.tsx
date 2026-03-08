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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Tag, RefreshCw, Download, Sparkles, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

export default function AdminDeals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editDeal, setEditDeal] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

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
  const expiringSoon = deals.filter((d: any) => d.expires_at && new Date(d.expires_at).getTime() - Date.now() < 7 * 86400000 && d.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Ưu đãi</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Thêm Deal
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-destructive">{expiringSoon}</p>
            <p className="text-xs text-muted-foreground">Sắp hết hạn</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Danh sách</TabsTrigger>
            <TabsTrigger value="collect">Thu thập</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="collect">
            <CollectDealsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <DealsAnalyticsTab deals={deals} />
          </TabsContent>
        </Tabs>

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

/* ─── Collect Deals Tab ────────────────────────────── */
function CollectDealsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [toolName, setToolName] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: collectedItems = [], isLoading } = useQuery({
    queryKey: ["deal-collect-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_collect_items").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("collect-deals", {
        body: { action: "search", query: searchQuery, tool_name: toolName || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-collect-items"] });
      toast.success(`Tìm thấy ${data.deals_count} deals`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("collect-deals", {
        body: { action: "import", item_ids: ids },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-collect-items"] });
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      setSelectedItems(new Set());
      toast.success(`Đã import ${data.imported} deals`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("collect-deals", {
        body: { action: "reject", item_ids: ids },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-collect-items"] });
      setSelectedItems(new Set());
      toast.success("Đã từ chối");
    },
  });

  const pendingItems = collectedItems.filter((i: any) => i.status === "pending");
  const toggleSelect = (id: string) => {
    setSelectedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">🔍 Thu thập deals từ web</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Từ khóa tìm kiếm</Label>
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="AI tools deals 2026..." />
            </div>
            <div>
              <Label>Tên tool cụ thể (tùy chọn)</Label>
              <Input value={toolName} onChange={e => setToolName(e.target.value)} placeholder="ChatGPT, Notion..." />
            </div>
          </div>
          <Button onClick={() => searchMutation.mutate()} disabled={searchMutation.isPending || (!searchQuery && !toolName)} size="sm">
            {searchMutation.isPending ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1 h-3.5 w-3.5" />}
            Thu thập deals
          </Button>
        </CardContent>
      </Card>

      {pendingItems.length > 0 && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => importMutation.mutate(Array.from(selectedItems))} disabled={selectedItems.size === 0 || importMutation.isPending}>
            <Download className="mr-1 h-3.5 w-3.5" /> Import ({selectedItems.size})
          </Button>
          <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(Array.from(selectedItems))} disabled={selectedItems.size === 0}>
            <XCircle className="mr-1 h-3.5 w-3.5" /> Từ chối ({selectedItems.size})
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Giảm giá</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : collectedItems.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa thu thập deals nào</TableCell></TableRow>
            ) : collectedItems.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.status === "pending" && (
                    <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                </TableCell>
                <TableCell className="text-sm">{item.tool_name || "—"}</TableCell>
                <TableCell>
                  {item.discount_value ? (
                    <Badge variant="destructive">
                      {item.discount_type === "percentage" ? `-${item.discount_value}%` : `-${item.discount_value} ${item.currency}`}
                    </Badge>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.coupon_code || "—"}</TableCell>
                <TableCell>
                  <Badge variant={item.status === "pending" ? "outline" : item.status === "imported" ? "default" : "secondary"}>
                    {item.status === "pending" ? "Chờ duyệt" : item.status === "imported" ? "Đã import" : item.status === "rejected" ? "Từ chối" : item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─── Analytics Tab ────────────────────────────── */
function DealsAnalyticsTab({ deals }: { deals: any[] }) {
  const topDeals = [...deals].sort((a, b) => (b.click_count || 0) - (a.click_count || 0)).slice(0, 10);
  const expiringSoon = deals.filter((d: any) => d.is_active && d.expires_at && new Date(d.expires_at).getTime() - Date.now() < 7 * 86400000 && new Date(d.expires_at) > new Date());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top Deals by Clicks</CardTitle></CardHeader>
          <CardContent>
            {topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-2">
                {topDeals.map((d: any, i) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">
                      <span className="text-muted-foreground mr-2">#{i + 1}</span>
                      {d.title}
                    </span>
                    <Badge variant="outline">{d.click_count || 0} clicks</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Sắp hết hạn (7 ngày)</CardTitle></CardHeader>
          <CardContent>
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có deal nào sắp hết hạn</p>
            ) : (
              <div className="space-y-2">
                {expiringSoon.map((d: any) => {
                  const daysLeft = Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{d.title}</span>
                      <Badge variant="destructive">{daysLeft}d left</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Deal Form Dialog ────────────────────────────── */
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

  const generateDesc = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("collect-deals", {
        body: { action: "generate-description", deal_title: form.title, tool_name: selectedTool?.name, discount_type: form.discount_type, discount_value: form.discount_value },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { if (data.description) update("description", data.description); },
    onError: () => toast.error("Lỗi tạo mô tả"),
  });

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
            <div className="flex items-center justify-between mb-1">
              <Label>Mô tả</Label>
              <Button variant="ghost" size="sm" onClick={() => generateDesc.mutate()} disabled={generateDesc.isPending || !form.title} className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" /> {generateDesc.isPending ? "Đang tạo..." : "AI viết mô tả"}
              </Button>
            </div>
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
