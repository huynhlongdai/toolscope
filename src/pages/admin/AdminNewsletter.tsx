import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Download, Upload, Mail, Users, UserCheck, UserX, Send, Eye, History, AlertTriangle } from "lucide-react";

export default function AdminNewsletter() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailForm, setEmailForm] = useState({ subject: "", content: "", sendToActive: true });
  const [campaignHistoryOpen, setCampaignHistoryOpen] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<"all" | "7d" | "30d">("all");
  const [importingCSV, setImportingCSV] = useState(false);

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("newsletter_subscribers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-newsletter"] }); toast.success("Đã cập nhật"); },
  });

  const deleteSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-newsletter"] }); toast.success("Đã xóa"); },
  });

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !confirm(`Xóa ${ids.length} subscribers?`)) return;
    for (const id of ids) await supabase.from("newsletter_subscribers").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-newsletter"] });
    setSelectedIds(new Set());
    toast.success(`Đã xóa ${ids.length} subscribers`);
  };

  const filtered = subscribers.filter((s: any) => {
    const matchSearch = s.email.toLowerCase().includes(search.toLowerCase());
    const matchActive = activeFilter === "all" || (activeFilter === "active" ? s.is_active : !s.is_active);
    return matchSearch && matchActive;
  });

  const activeCount = subscribers.filter((s: any) => s.is_active).length;
  const inactiveCount = subscribers.length - activeCount;

  // Segment by date
  const last7d = subscribers.filter((s: any) => s.is_active && new Date(s.subscribed_at) > new Date(Date.now() - 7 * 86400000)).length;
  const last30d = subscribers.filter((s: any) => s.is_active && new Date(s.subscribed_at) > new Date(Date.now() - 30 * 86400000)).length;

  const exportCSV = () => {
    const csv = ["Email,Active,Subscribed At", ...filtered.map((s: any) =>
      `${s.email},${s.is_active ? "Yes" : "No"},${new Date(s.subscribed_at).toISOString()}`
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filtered.length} subscribers`);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const getRecipients = () => {
    if (emailForm.sendToActive) return subscribers.filter((s: any) => s.is_active);
    return subscribers.filter((s: any) => selectedIds.has(s.id));
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Newsletter</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Quản lý subscribers và soạn email</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}><Mail className="mr-1 h-3.5 w-3.5" /> Soạn email</Button>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{subscribers.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><UserCheck className="h-4 w-4 text-emerald-500" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Mới 7 ngày</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{last7d}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Mới 30 ngày</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{last30d}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {(["all", "active", "inactive"] as const).map((f) => (
              <Button key={f} variant={activeFilter === f ? "secondary" : "ghost"} size="sm" onClick={() => setActiveFilter(f)}>
                {f === "all" ? "Tất cả" : f === "active" ? "Active" : "Inactive"}
              </Button>
            ))}
          </div>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={bulkDelete}>{selectedIds.size} đã chọn — Xóa</Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={() => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((s: any) => s.id))); }} /></TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không có subscriber</TableCell></TableRow>
              ) : (
                filtered.map((s: any) => (
                  <TableRow key={s.id} className={selectedIds.has(s.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>
                    <TableCell className="font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {s.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })} />
                        <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">{s.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Xóa?")) deleteSub.mutate(s.id); }} className="text-destructive text-xs">Xóa</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} / {subscribers.length} subscribers</p>
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Soạn Email Newsletter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề email *</Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm(p => ({ ...p, subject: e.target.value }))} placeholder="Bản tin tuần..." />
            </div>
            <div className="space-y-2">
              <Label>Nội dung *</Label>
              <Textarea value={emailForm.content} onChange={(e) => setEmailForm(p => ({ ...p, content: e.target.value }))} rows={8} placeholder="Nội dung email..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={emailForm.sendToActive} onCheckedChange={(v) => setEmailForm(p => ({ ...p, sendToActive: v }))} />
              <span className="text-sm">{emailForm.sendToActive ? `Gửi tới tất cả active subscribers (${activeCount})` : `Gửi tới subscribers đã chọn (${selectedIds.size})`}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!emailForm.subject || !emailForm.content}><Eye className="mr-1 h-3.5 w-3.5" /> Preview</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setComposeOpen(false)}>Hủy</Button>
                <Button disabled={!emailForm.subject || !emailForm.content} onClick={() => {
                  const recipients = getRecipients();
                  toast.info(`Email sẵn sàng gửi tới ${recipients.length} subscribers. Tích hợp email service (Resend/SendGrid) cần thiết để gửi thực tế.`);
                }}>
                  <Send className="mr-1 h-3.5 w-3.5" /> Gửi ({getRecipients().length})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Preview Email</DialogTitle></DialogHeader>
          <div className="space-y-4 border rounded-md p-4">
            <div className="border-b pb-2">
              <p className="text-xs text-muted-foreground">Subject:</p>
              <p className="font-semibold">{emailForm.subject}</p>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{emailForm.content}</div>
            <p className="text-xs text-muted-foreground">Gửi tới: {getRecipients().length} subscribers</p>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
