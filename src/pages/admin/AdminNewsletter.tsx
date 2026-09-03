import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, dateStampedFilename } from "@/lib/export";
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

  const { data: campaigns = [] } = useQuery({
    queryKey: ["newsletter-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "newsletter_campaigns").maybeSingle();
      return (data?.value as any[]) || [];
    },
  });

  // Detect duplicate emails
  const emailCounts: Record<string, number> = {};
  subscribers.forEach((s: any) => { emailCounts[s.email.toLowerCase()] = (emailCounts[s.email.toLowerCase()] || 0) + 1; });
  const duplicateEmails = new Set(Object.entries(emailCounts).filter(([_, c]) => c > 1).map(([e]) => e));

  const filtered = subscribers.filter((s: any) => {
    const matchSearch = s.email.toLowerCase().includes(search.toLowerCase());
    const matchActive = activeFilter === "all" || (activeFilter === "active" ? s.is_active : !s.is_active);
    const matchSegment = segmentFilter === "all" || (segmentFilter === "7d" ? new Date(s.subscribed_at) > new Date(Date.now() - 7 * 86400000) : new Date(s.subscribed_at) > new Date(Date.now() - 30 * 86400000));
    return matchSearch && matchActive && matchSegment;
  });

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCSV(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const emails: string[] = [];
      for (const line of lines) {
        const parts = line.split(",");
        const email = parts[0].replace(/["']/g, "").trim().toLowerCase();
        if (email.includes("@") && email !== "email") emails.push(email);
      }
      if (emails.length === 0) { toast.error("Không tìm thấy email hợp lệ"); return; }
      let added = 0;
      for (const email of emails) {
        const { error } = await supabase.from("newsletter_subscribers").insert({ email }).select();
        if (!error) added++;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter"] });
      toast.success(`Đã import ${added}/${emails.length} subscribers`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi import CSV");
    } finally {
      setImportingCSV(false);
      e.target.value = "";
    }
  };

  const saveCampaign = async () => {
    const campaign = { subject: emailForm.subject, content: emailForm.content, created_at: new Date().toISOString(), recipients: getRecipients().length };
    const updated = [campaign, ...campaigns].slice(0, 50);
    await supabase.from("site_settings").upsert({ key: "newsletter_campaigns", value: updated as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
  };

  const activeCount = subscribers.filter((s: any) => s.is_active).length;
  const inactiveCount = subscribers.length - activeCount;

  // Segment by date
  const last7d = subscribers.filter((s: any) => s.is_active && new Date(s.subscribed_at) > new Date(Date.now() - 7 * 86400000)).length;
  const last30d = subscribers.filter((s: any) => s.is_active && new Date(s.subscribed_at) > new Date(Date.now() - 30 * 86400000)).length;

  const exportCSV = () => {
    const headers = ["Email", "Active", "Subscribed At"];
    const rows = filtered.map((s: any) => [s.email, s.is_active ? "Yes" : "No", new Date(s.subscribed_at).toISOString()]);
    exportToCSV(headers, rows, dateStampedFilename("newsletter", "csv"));
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
            <Button variant="outline" size="sm" onClick={() => setCampaignHistoryOpen(true)}><History className="mr-1 h-3.5 w-3.5" /> Lịch sử</Button>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export CSV</Button>
            <div className="relative">
              <Button variant="outline" size="sm" disabled={importingCSV}><Upload className="mr-1 h-3.5 w-3.5" /> Import CSV</Button>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
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

        {duplicateEmails.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Phát hiện {duplicateEmails.size} email trùng lặp
          </div>
        )}

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
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {(["all", "7d", "30d"] as const).map((f) => (
              <Button key={f} variant={segmentFilter === f ? "secondary" : "ghost"} size="sm" onClick={() => setSegmentFilter(f)}>
                {f === "all" ? "Tất cả" : f === "7d" ? "Mới 7d" : "Mới 30d"}
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
                    <TableCell className="font-medium flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {s.email}
                      {duplicateEmails.has(s.email.toLowerCase()) && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Trùng</Badge>}
                    </TableCell>
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
                <Button disabled={!emailForm.subject || !emailForm.content} onClick={async () => {
                  const recipients = getRecipients();
                  await saveCampaign();
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

      {/* Campaign History Dialog */}
      <Dialog open={campaignHistoryOpen} onOpenChange={setCampaignHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Lịch sử email đã soạn</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có email nào</p>
            ) : (
              campaigns.map((c: any, i: number) => (
                <div key={i} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{c.subject}</p>
                    <Badge variant="outline" className="text-[10px]">{c.recipients} người</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("vi-VN")}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
