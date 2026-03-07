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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ExternalLink, Star, Eye, MessageSquare, RefreshCw, Sparkles, Loader2, Upload, CheckCircle2, XCircle, Clock, Languages, Filter, MoreHorizontal, HeartPulse, Activity } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";
import { EntityTranslationEditor } from "@/components/admin/translations/EntityTranslationEditor";
import { marked } from "marked";
import { Progress } from "@/components/ui/progress";
import { logAuditAction } from "@/hooks/useAuditLog";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

export default function AdminTools() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [translationFilter, setTranslationFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [editTool, setEditTool] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [checkingHealthAll, setCheckingHealthAll] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-list-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

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

  const pendingTools = tools.filter((t: any) => t.status === "pending_review");

  const { data: toolTranslationMap = new Map<string, Set<string>>() } = useQuery({
    queryKey: ["admin-tools-translation-map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("translations")
        .select("entity_id, locale")
        .eq("entity_type", "tool");
      const map = new Map<string, Set<string>>();
      (data ?? []).forEach((t: any) => {
        if (!map.has(t.entity_id)) map.set(t.entity_id, new Set());
        map.get(t.entity_id)!.add(t.locale);
      });
      return map;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      logAuditAction("tool_delete", "tool", id);
      toast.success("Đã xóa tool");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tools").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      logAuditAction("tool_status_change", "tool", vars.id, { status: vars.status });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const [page, setPage] = useState(0);
  const pageSize = 50;

  const filtered = tools.filter((t: any) => {
    if (!t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
    if (pricingFilter !== "all" && t.pricing_type !== pricingFilter) return false;
    if (healthFilter !== "all" && t.health_status !== healthFilter) return false;
    if (translationFilter === "translated" && (!toolTranslationMap.has(t.id) || toolTranslationMap.get(t.id)!.size === 0)) return false;
    if (translationFilter === "untranslated" && toolTranslationMap.has(t.id) && toolTranslationMap.get(t.id)!.size > 0) return false;
    if (translationFilter !== "all" && translationFilter !== "translated" && translationFilter !== "untranslated") {
      const locales = toolTranslationMap.get(t.id);
      if (locales && locales.has(translationFilter)) return false;
    }
    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const headers = ["Name", "Slug", "Status", "Pricing", "Rating", "Views", "Category", "Website"];
    const rows = filtered.map((t: any) => [t.name, t.slug, t.status, t.pricing_type, t.avg_rating || "", t.view_count, (t as any).categories?.name || "", t.website_url || ""]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tools.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "published": return "default";
      case "draft": return "secondary";
      case "pending_review": return "outline";
      case "archived": return "destructive";
      default: return "secondary";
    }
  };

  // Count active filters (excluding "all")
  const activeFilterCount = [statusFilter, categoryFilter, pricingFilter, translationFilter].filter(f => f !== "all").length;

  const filterContent = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trạng thái</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả TT</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Danh mục</Label>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả DM</SelectItem>
            {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pricing</Label>
        <Select value={pricingFilter} onValueChange={(v) => { setPricingFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Pricing" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả giá</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="freemium">Freemium</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="open_source">Open Source</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Ngôn ngữ</Label>
        <Select value={translationFilter} onValueChange={(v) => { setTranslationFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Ngôn ngữ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ngôn ngữ</SelectItem>
            <SelectItem value="translated">✅ Đã dịch (bất kỳ)</SelectItem>
            <SelectItem value="untranslated">⚠️ Chưa dịch</SelectItem>
            {TARGET_LOCALES.map(([code, meta]) => (
              <SelectItem key={code} value={code}>
                {meta.flag} Chưa dịch {meta.nativeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Tools</h1>
          <div className="flex items-center gap-2">
            {/* Mobile: group secondary actions */}
            {isMobile ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCSV}><Upload className="mr-2 h-4 w-4" /> Xuất CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowBatchImport(true)}><Upload className="mr-2 h-4 w-4" /> Import</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <BatchTranslateButton tools={filtered} isMobile={isMobile} />
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={exportCSV}><Upload className="mr-1 h-3.5 w-3.5" /> CSV</Button>
                <BatchTranslateButton tools={filtered} isMobile={false} />
                <Button variant="outline" size="sm" onClick={() => setShowBatchImport(true)}><Upload className="mr-1 h-3.5 w-3.5" /> Import</Button>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm</Button>
              </>
            )}
          </div>
        </div>

        {/* Pending Submissions */}
        {pendingTools.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Tool đề xuất chờ duyệt ({pendingTools.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4">
              <div className="space-y-2">
                {pendingTools.slice(0, 10).map((tool: any) => (
                  <div key={tool.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-md border bg-background p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {tool.logo_url && <img src={tool.logo_url} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tool.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tool.short_description || tool.website_url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setEditTool(tool)} className="text-xs h-7 px-2">
                        <Eye className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Xem</span>
                      </Button>
                      <Button variant="default" size="sm" onClick={() => updateStatusMutation.mutate({ id: tool.id, status: "published" })} className="text-xs h-7 px-2">
                        <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Duyệt</span>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => updateStatusMutation.mutate({ id: tool.id, status: "archived" })} className="text-xs h-7 px-2">
                        <XCircle className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Từ chối</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingTools.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">+{pendingTools.length - 10} tool khác đang chờ duyệt</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>

          {/* Mobile: filter sheet */}
          {isMobile ? (
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative shrink-0">
                  <Filter className="h-4 w-4 mr-1" /> Lọc
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Bộ lọc</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {filterContent}
                  <Button className="w-full mt-4" onClick={() => setFilterSheetOpen(false)}>Áp dụng</Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả DM</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={pricingFilter} onValueChange={(v) => { setPricingFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pricing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả giá</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="open_source">Open Source</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                </SelectContent>
              </Select>
              <Select value={translationFilter} onValueChange={(v) => { setTranslationFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ngôn ngữ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngôn ngữ</SelectItem>
                  <SelectItem value="translated">✅ Đã dịch (bất kỳ)</SelectItem>
                  <SelectItem value="untranslated">⚠️ Chưa dịch</SelectItem>
                  {TARGET_LOCALES.map(([code, meta]) => (
                    <SelectItem key={code} value={code}>
                      {meta.flag} Chưa dịch {meta.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tools List */}
        {isMobile ? (
          /* Mobile: Card layout */
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Đang tải...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Không có tool nào</p>
            ) : (
              paged.map((tool: any) => {
                const locales = toolTranslationMap.get(tool.id);
                const flags = locales ? TARGET_LOCALES.filter(([code]) => locales.has(code)).map(([, meta]) => meta.flag) : [];
                return (
                  <Card key={tool.id} className="p-3">
                    <div className="flex items-start gap-3">
                      {tool.logo_url && <img src={tool.logo_url} alt="" className="h-10 w-10 rounded-md object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{tool.name}</p>
                          <Badge variant={statusColor(tool.status) as any} className="text-[10px] shrink-0">{tool.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{(tool as any).categories?.name ?? "—"} · {tool.pricing_type}</p>
                        {flags.length > 0 && (
                          <p className="text-xs mt-1" title={`${locales!.size}/${TARGET_LOCALES.length}`}>
                            {flags.length <= 5 ? flags.join("") : `${flags.slice(0, 4).join("")} +${flags.length - 4}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <TranslateButton toolId={tool.id} toolName={tool.name} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTool(tool)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Xóa tool này?")) deleteMutation.mutate(tool.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          /* Desktop: Table layout */
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Ngôn ngữ</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Đang tải...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có tool nào</TableCell></TableRow>
                ) : (
                  paged.map((tool: any) => (
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
                      <TableCell>
                        {(() => {
                          const locales = toolTranslationMap.get(tool.id);
                          if (!locales || locales.size === 0) return <span className="text-xs text-muted-foreground">—</span>;
                          const flags = TARGET_LOCALES
                            .filter(([code]) => locales.has(code))
                            .map(([code, meta]) => meta.flag);
                          return (
                            <span className="text-xs" title={`${locales.size}/${TARGET_LOCALES.length} ngôn ngữ`}>
                              {flags.length <= 5 ? flags.join("") : `${flags.slice(0, 4).join("")} +${flags.length - 4}`}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{tool.avg_rating ? `${Number(tool.avg_rating).toFixed(1)} ⭐` : "—"}</TableCell>
                      <TableCell>{tool.view_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <GenerateAIScoreButton toolId={tool.id} toolName={tool.name} />
                          <TranslateButton toolId={tool.id} toolName={tool.name} />
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
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{filtered.length} tools</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <span className="text-sm">Trang {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}

        {(editTool || showAdd) && (
          <ToolFormDialog
            tool={editTool}
            open={!!editTool || showAdd}
            onClose={() => { setEditTool(null); setShowAdd(false); }}
          />
        )}

        {showBatchImport && (
          <BatchImportDialog
            open={showBatchImport}
            onClose={() => { setShowBatchImport(false); queryClient.invalidateQueries({ queryKey: ["admin-tools"] }); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ToolFormDialog({ tool, open, onClose }: { tool: any; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillQuery, setAutoFillQuery] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Query translation count for badge
  const { data: translationCount = 0 } = useQuery({
    queryKey: ["tool-translation-count", tool?.id],
    queryFn: async () => {
      if (!tool?.id) return 0;
      const { data } = await supabase
        .from("translations")
        .select("locale")
        .eq("entity_type", "tool")
        .eq("entity_id", tool.id);
      const uniqueLocales = new Set((data ?? []).map((t: any) => t.locale));
      return uniqueLocales.size;
    },
    enabled: !!tool?.id,
  });

  const autoConvert = (text: string) => {
    if (!text) return text;
    const looksLikeMarkdown = /^#{1,4}\s/m.test(text) || /\*\*[^*]+\*\*/m.test(text) || /^-\s/m.test(text) || /^\d+\.\s/m.test(text);
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(text);
    if (looksLikeMarkdown && !looksLikeHtml) {
      return marked.parse(text, { async: false }) as string;
    }
    return text;
  };

  const [form, setForm] = useState({
    name: tool?.name ?? "",
    slug: tool?.slug ?? "",
    description: autoConvert(tool?.description ?? ""),
    short_description: tool?.short_description ?? "",
    detailed_content: autoConvert(tool?.detailed_content ?? ""),
    website_url: tool?.website_url ?? "",
    logo_url: tool?.logo_url ?? "",
    affiliate_url: tool?.affiliate_url ?? "",
    pricing_type: tool?.pricing_type ?? "free",
    category_id: tool?.category_id ?? "",
    platforms: tool?.platforms ?? [],
    is_featured: tool?.is_featured ?? false,
    is_trending: tool?.is_trending ?? false,
    avg_rating: tool?.avg_rating ?? 0,
    rating_count: tool?.rating_count ?? 0,
    view_count: tool?.view_count ?? 0,
    pricing_details: tool?.pricing_details ?? [],
    faq: (tool as any)?.faq ?? [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags-list"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: toolTags = [], refetch: refetchTags } = useQuery({
    queryKey: ["tool-tags", tool?.id],
    queryFn: async () => {
      if (!tool?.id) return [];
      const { data } = await supabase.from("tool_tags").select("tag_id").eq("tool_id", tool.id);
      return data?.map((t: any) => t.tag_id) ?? [];
    },
    enabled: !!tool?.id,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["tool-reviews-admin", tool?.id],
    queryFn: async () => {
      if (!tool?.id) return [];
      const { data } = await supabase.from("reviews").select("*, profiles:author_id(display_name)").eq("tool_id", tool.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!tool?.id,
  });

  const { data: questions = [], refetch: refetchQuestions } = useQuery({
    queryKey: ["tool-questions-admin", tool?.id],
    queryFn: async () => {
      if (!tool?.id) return [];
      const { data } = await supabase.from("questions").select("*, answers(*)").eq("tool_id", tool.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!tool?.id,
  });

  const [relatedSearch, setRelatedSearch] = useState("");
  const [relatedIds, setRelatedIds] = useState<string[]>(tool?.related_tool_ids ?? []);

  const { data: relatedSearchResults = [] } = useQuery({
    queryKey: ["tools-search", relatedSearch],
    queryFn: async () => {
      if (!relatedSearch) return [];
      const { data } = await supabase.from("tools").select("id, name, slug").ilike("name", `%${relatedSearch}%`).limit(5);
      return data ?? [];
    },
    enabled: relatedSearch.length > 1,
  });

  const { data: relatedTools = [] } = useQuery({
    queryKey: ["related-tools", relatedIds],
    queryFn: async () => {
      if (relatedIds.length === 0) return [];
      const { data } = await supabase.from("tools").select("id, name, slug").in("id", relatedIds);
      return data ?? [];
    },
    enabled: relatedIds.length > 0,
  });

  const [fakeReview, setFakeReview] = useState({ title: "", content: "" });
  const [fakeQuestion, setFakeQuestion] = useState({ title: "", content: "" });
  const [fakeAnswer, setFakeAnswer] = useState({ questionId: "", content: "" });
  const [newPlan, setNewPlan] = useState({ name: "", price: "", currency: "USD", features: "" });

  const pricingPlans = Array.isArray(form.pricing_details) ? form.pricing_details : [];

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAutoFill = async () => {
    const query = autoFillQuery.trim() || form.website_url || form.name;
    if (!query) { toast.error("Nhập tên tool hoặc URL để thu thập"); return; }
    setAutoFilling(true);
    try {
      const isUrl = /^https?:\/\//i.test(query) || /\.\w{2,}/.test(query);
      const { data, error } = await supabase.functions.invoke("collect-tool-data", {
        body: isUrl ? { url: query } : { name: query },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        slug: data.slug || prev.slug,
        short_description: data.short_description || prev.short_description,
        description: autoConvert(data.description || prev.description),
        detailed_content: autoConvert(data.detailed_content || prev.detailed_content),
        website_url: data.website_url || prev.website_url,
        logo_url: data.logo_url || prev.logo_url,
        pricing_type: data.pricing_type || prev.pricing_type,
        platforms: data.platforms?.length ? data.platforms : prev.platforms,
        pricing_details: Array.isArray(data.pricing_details) && data.pricing_details.length > 0 ? data.pricing_details : prev.pricing_details,
        faq: Array.isArray(data.faq) && data.faq.length > 0 ? data.faq : prev.faq,
      }));

      if (data.category_suggestion && categories.length > 0) {
        const suggestion = data.category_suggestion.toLowerCase();
        const match = categories.find((c: any) => c.name.toLowerCase().includes(suggestion) || suggestion.includes(c.name.toLowerCase()));
        if (match) updateField("category_id", match.id);
      }

      if (Array.isArray(data.tags) && data.tags.length > 0) {
        setSuggestedTags(data.tags);
      }

      toast.success("Đã thu thập thông tin thành công!");
    } catch (e: any) {
      toast.error(e.message || "Không thể thu thập dữ liệu");
    } finally {
      setAutoFilling(false);
    }
  };

  const platformOptions = ["Web", "iOS", "Android", "macOS", "Windows", "Linux"];

  const togglePlatform = (p: string) => {
    updateField("platforms", form.platforms.includes(p) ? form.platforms.filter((x: string) => x !== p) : [...form.platforms, p]);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Tên và slug là bắt buộc"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name, slug: form.slug, description: form.description,
      short_description: form.short_description, detailed_content: form.detailed_content,
      website_url: form.website_url || null, logo_url: form.logo_url || null,
      affiliate_url: form.affiliate_url || null, pricing_type: form.pricing_type as any,
      category_id: form.category_id || null, platforms: form.platforms,
      is_featured: form.is_featured, is_trending: form.is_trending,
      avg_rating: form.avg_rating, rating_count: form.rating_count,
      view_count: form.view_count, pricing_details: pricingPlans,
      related_tool_ids: relatedIds,
      faq: form.faq.length > 0 ? form.faq : null,
    };

    let savedToolId = tool?.id;

    if (tool) {
      const { error } = await supabase.from("tools").update(payload).eq("id", tool.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data: newTool, error } = await supabase.from("tools").insert({ ...payload, status: "published" as any }).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      savedToolId = newTool?.id;
    }

    if (savedToolId && suggestedTags.length > 0) {
      await autoCreateAndAssignTags(savedToolId, suggestedTags);
    }

    toast.success(tool ? "Đã cập nhật tool" : "Đã thêm tool");
    queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
    setSaving(false);
    onClose();
  };

  const autoCreateAndAssignTags = async (toolId: string, tagNames: string[]) => {
    for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!slug) continue;
      let { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
      let tagId = existing?.id;
      if (!tagId) {
        const { data: created } = await supabase.from("tags").insert({ name: tagName, slug }).select("id").single();
        tagId = created?.id;
      }
      if (tagId) {
        await supabase.from("tool_tags").upsert({ tool_id: toolId, tag_id: tagId }, { onConflict: "tool_id,tag_id" });
      }
    }
  };

  const createFakeReview = async () => {
    if (!fakeReview.title || !user?.id) return;
    const { error } = await supabase.from("reviews").insert({
      tool_id: tool.id, author_id: user.id, title: fakeReview.title,
      content: fakeReview.content, is_editor_review: true, status: "published" as any,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã tạo review ảo"); setFakeReview({ title: "", content: "" }); refetchReviews(); }
  };

  const toggleReviewStatus = async (id: string, current: string) => {
    const newStatus = current === "published" ? "draft" : "published";
    await supabase.from("reviews").update({ status: newStatus as any }).eq("id", id);
    refetchReviews();
  };

  const deleteReview = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    refetchReviews(); toast.success("Đã xóa review");
  };

  const createFakeQuestion = async () => {
    if (!fakeQuestion.title || !user?.id) return;
    const { error } = await supabase.from("questions").insert({
      tool_id: tool.id, user_id: user.id, title: fakeQuestion.title, content: fakeQuestion.content,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã tạo Q&A ảo"); setFakeQuestion({ title: "", content: "" }); refetchQuestions(); }
  };

  const createFakeAnswer = async () => {
    if (!fakeAnswer.content || !fakeAnswer.questionId || !user?.id) return;
    const { error } = await supabase.from("answers").insert({
      question_id: fakeAnswer.questionId, user_id: user.id, content: fakeAnswer.content,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã thêm câu trả lời"); setFakeAnswer({ questionId: "", content: "" }); refetchQuestions(); }
  };

  const addPlan = () => {
    if (!newPlan.name) return;
    const plans = [...pricingPlans, { name: newPlan.name, price: parseFloat(newPlan.price) || 0, currency: newPlan.currency, features: newPlan.features.split(",").map((f: string) => f.trim()).filter(Boolean) }];
    updateField("pricing_details", plans);
    setNewPlan({ name: "", price: "", currency: "USD", features: "" });
  };

  const removePlan = (idx: number) => {
    updateField("pricing_details", pricingPlans.filter((_: any, i: number) => i !== idx));
  };

  const toggleTag = async (tagId: string) => {
    if (!tool?.id) return;
    if (toolTags.includes(tagId)) {
      await supabase.from("tool_tags").delete().eq("tool_id", tool.id).eq("tag_id", tagId);
    } else {
      await supabase.from("tool_tags").insert({ tool_id: tool.id, tag_id: tagId });
    }
    refetchTags();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Chỉnh sửa Tool" : "Thêm Tool mới"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="basic">Cơ bản</TabsTrigger>
              <TabsTrigger value="content">Nội dung</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="translations" disabled={!tool?.id} className="gap-1">
                Dịch
                {tool?.id && translationCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                    {translationCount}/{TARGET_LOCALES.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Tab: Basic */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Auto-fill Card */}
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Thu thập tự động bằng AI</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Nhập tên tool hoặc URL"
                    value={autoFillQuery}
                    onChange={(e) => setAutoFillQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !autoFilling && handleAutoFill()}
                    disabled={autoFilling}
                  />
                  <Button onClick={handleAutoFill} disabled={autoFilling} className="shrink-0">
                    {autoFilling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {autoFilling ? "Đang thu thập..." : "Thu thập"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">AI sẽ tự động điền tên, mô tả, giá, nền tảng, logo và nội dung chi tiết</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên *</Label>
                <Input value={form.name} onChange={(e) => { updateField("name", e.target.value); if (!tool) updateField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả ngắn</Label>
              <Input value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={form.category_id} onValueChange={(v) => updateField("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={(v) => updateField("pricing_type", v)}>
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Website URL</Label><Input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} /></div>
              <div className="space-y-2"><Label>Affiliate URL</Label><Input value={form.affiliate_url} onChange={(e) => updateField("affiliate_url", e.target.value)} /></div>
            </div>
            <CoverImageUpload value={form.logo_url} onChange={(v) => updateField("logo_url", v)} label="Logo" />
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map(p => (
                  <Button key={p} type="button" variant={form.platforms.includes(p) ? "default" : "outline"} size="sm" onClick={() => togglePlatform(p)}>{p}</Button>
                ))}
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => updateField("is_featured", v)} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_trending} onCheckedChange={(v) => updateField("is_trending", v)} /><Label>Trending</Label></div>
            </div>
            {tool?.id && tags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags có sẵn</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t: any) => (
                    <Button key={t.id} type="button" variant={toolTags.includes(t.id) ? "default" : "outline"} size="sm" onClick={() => toggleTag(t.id)}>{t.name}</Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Tags AI gợi ý
              </Label>
              {suggestedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button onClick={() => setSuggestedTags(prev => prev.filter((_, i) => i !== idx))} className="ml-1 hover:text-destructive text-xs">×</button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Thu thập bằng AI hoặc thêm thủ công bên dưới</p>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Thêm tag mới..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagInput.trim()) {
                      e.preventDefault();
                      setSuggestedTags(prev => [...prev, newTagInput.trim()]);
                      setNewTagInput("");
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  if (newTagInput.trim()) {
                    setSuggestedTags(prev => [...prev, newTagInput.trim()]);
                    setNewTagInput("");
                  }
                }}>Thêm</Button>
              </div>
              <p className="text-xs text-muted-foreground">Tags sẽ được tạo tự động khi lưu tool. Nhấn Enter hoặc nút Thêm để thêm tag.</p>
            </div>
          </TabsContent>

          {/* Tab: Content */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <ContentTabWithPreview form={form} updateField={updateField} toolName={form.name} />
          </TabsContent>

          {/* Tab: FAQ */}
          <TabsContent value="faq" className="space-y-4 mt-4">
            <FAQTab tool={tool} form={form} updateField={updateField} />
          </TabsContent>

          {/* Tab: Fake Stats */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Fake Rating & Views</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Avg Rating (0-5)</Label>
                    <Input type="number" min={0} max={5} step={0.1} value={form.avg_rating} onChange={(e) => updateField("avg_rating", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating Count</Label>
                    <Input type="number" min={0} value={form.rating_count} onChange={(e) => updateField("rating_count", parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>View Count</Label>
                    <Input type="number" min={0} value={form.view_count} onChange={(e) => updateField("view_count", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Giá trị sẽ hiển thị trực tiếp trên trang tool.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Reviews & Q&A */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {!tool?.id ? (
              <p className="text-sm text-muted-foreground">Lưu tool trước để quản lý reviews & Q&A.</p>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Reviews ({reviews.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b pb-2 last:border-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{r.title}</span>
                            {r.is_editor_review && <Badge variant="secondary" className="text-[10px]">Editor</Badge>}
                            <Badge variant={r.status === "published" ? "default" : "outline"} className="text-[10px]">{r.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.content}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => toggleReviewStatus(r.id, r.status)}>
                            {r.status === "published" ? "Ẩn" : "Hiện"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteReview(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium">Tạo review ảo</p>
                      <Input placeholder="Tiêu đề review" value={fakeReview.title} onChange={(e) => setFakeReview(prev => ({ ...prev, title: e.target.value }))} />
                      <Textarea placeholder="Nội dung review..." value={fakeReview.content} onChange={(e) => setFakeReview(prev => ({ ...prev, content: e.target.value }))} rows={2} />
                      <Button size="sm" onClick={createFakeReview}>Tạo Review</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Q&A ({questions.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {questions.map((q: any) => (
                      <div key={q.id} className="border-b pb-2 last:border-0">
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">{q.answers?.length ?? 0} câu trả lời</p>
                      </div>
                    ))}
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium">Tạo câu hỏi ảo</p>
                      <Input placeholder="Tiêu đề câu hỏi" value={fakeQuestion.title} onChange={(e) => setFakeQuestion(prev => ({ ...prev, title: e.target.value }))} />
                      <Textarea placeholder="Chi tiết (optional)" value={fakeQuestion.content} onChange={(e) => setFakeQuestion(prev => ({ ...prev, content: e.target.value }))} rows={2} />
                      <Button size="sm" onClick={createFakeQuestion}>Tạo Câu hỏi</Button>
                    </div>
                    {questions.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-sm font-medium">Thêm câu trả lời</p>
                        <Select value={fakeAnswer.questionId} onValueChange={(v) => setFakeAnswer(prev => ({ ...prev, questionId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Chọn câu hỏi" /></SelectTrigger>
                          <SelectContent>
                            {questions.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Textarea placeholder="Nội dung trả lời..." value={fakeAnswer.content} onChange={(e) => setFakeAnswer(prev => ({ ...prev, content: e.target.value }))} rows={2} />
                        <Button size="sm" onClick={createFakeAnswer}>Thêm Trả lời</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Pricing */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pricing Plans</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pricingPlans.map((plan: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.price} {plan.currency}</p>
                      {plan.features?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {plan.features.map((f: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>)}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removePlan(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-medium">Thêm plan mới</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Tên plan" value={newPlan.name} onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))} />
                    <Input placeholder="Giá" type="number" value={newPlan.price} onChange={(e) => setNewPlan(prev => ({ ...prev, price: e.target.value }))} />
                    <Select value={newPlan.currency} onValueChange={(v) => setNewPlan(prev => ({ ...prev, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Features (cách nhau bằng dấu phẩy)" value={newPlan.features} onChange={(e) => setNewPlan(prev => ({ ...prev, features: e.target.value }))} />
                  <Button size="sm" onClick={addPlan}>Thêm Plan</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: SEO & Related */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Tool gợi ý (Related)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {relatedTools.map((t: any) => (
                    <Badge key={t.id} variant="secondary" className="gap-1">
                      {t.name}
                      <button onClick={() => setRelatedIds(prev => prev.filter(id => id !== t.id))} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Tìm tool để thêm..." value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)} />
                {relatedSearchResults.length > 0 && (
                  <div className="border rounded-md divide-y">
                    {relatedSearchResults.filter((t: any) => !relatedIds.includes(t.id) && t.id !== tool?.id).map((t: any) => (
                      <button key={t.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => { setRelatedIds(prev => [...prev, t.id]); setRelatedSearch(""); }}>
                        {t.name} <span className="text-muted-foreground">/{t.slug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">SEO Preview</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-blue-600 font-medium">{form.name || "Tool Name"}</p>
                <p className="text-sm text-green-700 break-all">{window.location.origin}/tool/{form.slug || "slug"}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{form.short_description || "Mô tả ngắn..."}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Share Preview</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Facebook:</span> <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/tool/${form.slug}`)}`} target="_blank" rel="noopener" className="text-primary hover:underline">Share</a></p>
                <p><span className="text-muted-foreground">Twitter:</span> <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/tool/${form.slug}`)}&text=${encodeURIComponent(form.name)}`} target="_blank" rel="noopener" className="text-primary hover:underline">Tweet</a></p>
                <p><span className="text-muted-foreground">LinkedIn:</span> <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/tool/${form.slug}`)}`} target="_blank" rel="noopener" className="text-primary hover:underline">Post</a></p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Translations */}
          <TabsContent value="translations" className="mt-4">
            <EntityTranslationEditor
              entityType="tool"
              entityId={tool?.id}
              fields={[
                { key: "name", label: "Tên", type: "input", originalValue: form.name },
                { key: "short_description", label: "Mô tả ngắn", type: "input", originalValue: form.short_description },
                { key: "description", label: "Mô tả", type: "richtext", originalValue: form.description },
                { key: "detailed_content", label: "Nội dung chi tiết", type: "richtext", originalValue: form.detailed_content },
              ]}
              translateFunctionName="translate-tool"
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Content Tab with Preview ────────────────────────────── */
function ContentTabWithPreview({ form, updateField, toolName }: { form: any; updateField: (k: string, v: any) => void; toolName: string }) {
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Nội dung</Label>
        <div className="flex gap-1 rounded-lg border p-0.5">
          <Button
            type="button"
            variant={previewMode === "edit" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPreviewMode("edit")}
          >
            Chỉnh sửa
          </Button>
          <Button
            type="button"
            variant={previewMode === "preview" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPreviewMode("preview")}
          >
            <Eye className="h-3 w-3 mr-1" /> Xem trước
          </Button>
        </div>
      </div>

      {previewMode === "edit" ? (
        <>
          <div className="space-y-2">
            <Label>Mô tả (Description)</Label>
            <RichTextEditor content={form.description} onChange={(v: string) => updateField("description", v)} placeholder="Mô tả tool..." />
          </div>
          <div className="space-y-2">
            <Label>Nội dung chi tiết (Detailed Content)</Label>
            <RichTextEditor content={form.detailed_content} onChange={(v: string) => updateField("detailed_content", v)} placeholder="Nội dung giới thiệu chi tiết..." />
          </div>
        </>
      ) : (
        <div className="space-y-6 rounded-lg border p-4 sm:p-6 bg-background">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Mô tả</h3>
            {form.description ? (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: form.description }} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có mô tả</p>
            )}
          </div>
          <hr className="border-border" />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Nội dung chi tiết</h3>
            {form.detailed_content ? (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: form.detailed_content }} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có nội dung chi tiết</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FAQ Tab ──────────────────────────────────────────────── */
function FAQTab({ tool, form, updateField }: { tool: any; form: any; updateField: (k: string, v: any) => void }) {
  const faqItems: { question: string; answer: string }[] = Array.isArray(form.faq) ? form.faq : [];
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const addItem = () => {
    if (!newQ.trim() || !newA.trim()) return;
    updateField("faq", [...faqItems, { question: newQ.trim(), answer: newA.trim() }]);
    setNewQ(""); setNewA("");
  };

  const removeItem = (idx: number) => {
    updateField("faq", faqItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: "question" | "answer", value: string) => {
    updateField("faq", faqItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> FAQ ({faqItems.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">FAQ được tạo tự động khi AI thu thập hoặc viết bài. Bạn có thể chỉnh sửa thủ công.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {faqItems.map((item, idx) => (
          <div key={idx} className="border rounded-md p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.question}
                  onChange={(e) => updateItem(idx, "question", e.target.value)}
                  placeholder="Câu hỏi"
                  className="font-medium"
                />
                <Textarea
                  value={item.answer}
                  onChange={(e) => updateItem(idx, "answer", e.target.value)}
                  placeholder="Câu trả lời"
                  rows={2}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm font-medium">Thêm FAQ mới</p>
          <Input placeholder="Câu hỏi?" value={newQ} onChange={(e) => setNewQ(e.target.value)} />
          <Textarea placeholder="Câu trả lời..." value={newA} onChange={(e) => setNewA(e.target.value)} rows={2} />
          <Button size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Thêm</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ====== Batch Import Dialog ======
type BatchItem = {
  url: string;
  status: "pending" | "processing" | "done" | "error";
  name?: string;
  error?: string;
};

function BatchImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [urlsText, setUrlsText] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const parseUrls = () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) {
      toast.error("Nhập ít nhất 1 URL");
      return;
    }
    if (urls.length > 50) {
      toast.error("Tối đa 50 URL mỗi lần");
      return;
    }
    setItems(urls.map((url) => ({ url, status: "pending" })));
  };

  const startImport = async () => {
    if (items.length === 0) return;
    setRunning(true);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
      );

      try {
        const { data, error } = await supabase.functions.invoke("collect-tool-data", {
          body: { url: items[i].url, save_to_db: true },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "done", name: data.name || items[i].url } : item
          )
        );
      } catch (e: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: e.message || "Lỗi không xác định" } : item
          )
        );
      }

      if (i < items.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setRunning(false);
    setCurrentIndex(-1);
    toast.success("Batch import hoàn tất!");
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const progress = items.length > 0 ? ((doneCount + errorCount) / items.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !running && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Batch Import Tools
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nhập danh sách URL (mỗi dòng 1 URL)</Label>
              <Textarea
                rows={10}
                placeholder={"https://figma.com\nhttps://notion.so\nhttps://slack.com\nhttps://linear.app"}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tối đa 50 URL. AI sẽ tự động thu thập thông tin và tạo tool với trạng thái "pending_review".
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button onClick={parseUrls}>
                <Sparkles className="h-4 w-4 mr-2" /> Chuẩn bị Import ({urlsText.split("\n").filter((l) => l.trim()).length} URL)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {running && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang xử lý... ({doneCount + errorCount}/{items.length})</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="shrink-0">
                    {item.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                    {item.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {item.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.name || item.url}</p>
                    {item.error && <p className="text-xs text-destructive truncate">{item.error}</p>}
                  </div>
                  <Badge variant={
                    item.status === "done" ? "default" :
                    item.status === "error" ? "destructive" :
                    item.status === "processing" ? "secondary" : "outline"
                  } className="text-xs shrink-0">
                    {item.status === "pending" ? "Chờ" : item.status === "processing" ? "Đang xử lý" : item.status === "done" ? "Xong" : "Lỗi"}
                  </Badge>
                </div>
              ))}
            </div>

            {!running && doneCount + errorCount === items.length && items.length > 0 && (
              <div className="text-sm text-center py-2">
                <span className="text-green-600 font-medium">{doneCount} thành công</span>
                {errorCount > 0 && <span className="text-destructive font-medium ml-3">{errorCount} lỗi</span>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {!running && doneCount + errorCount < items.length && (
                <>
                  <Button variant="outline" onClick={() => setItems([])}>Quay lại</Button>
                  <Button onClick={startImport}>
                    <Sparkles className="h-4 w-4 mr-2" /> Bắt đầu Import
                  </Button>
                </>
              )}
              {!running && doneCount + errorCount === items.length && items.length > 0 && (
                <Button onClick={onClose}>Đóng</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TranslateButton({ toolId, toolName }: { toolId: string; toolName: string }) {
  const [translating, setTranslating] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleTranslate = async (locale: string) => {
    setTranslating(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("translate-tool", {
        body: { tool_id: toolId, locale },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const localeMeta = SUPPORTED_LOCALES[locale as Locale];
      toast.success(`Đã dịch "${toolName}" sang ${localeMeta?.nativeName || locale} (${data.saved} trường)`);
      queryClient.invalidateQueries({ queryKey: ["admin-tools-translation-map"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi dịch tự động");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" disabled={translating} title="Dịch tool" className="h-8 w-8">
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {TARGET_LOCALES.map(([code, meta]) => (
          <Button key={code} variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleTranslate(code)}>
            {meta.flag} {meta.nativeName}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function BatchTranslateButton({ tools, isMobile }: { tools: any[]; isMobile: boolean }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batchLocale, setBatchLocale] = useState<Locale>("en");
  const queryClient = useQueryClient();

  const handleBatchTranslate = async () => {
    const publishedTools = tools.filter((t: any) => t.status === "published");
    if (publishedTools.length === 0) { toast.error("Không có tool published nào"); return; }
    const localeMeta = SUPPORTED_LOCALES[batchLocale];
    if (!confirm(`Dịch ${publishedTools.length} tools sang ${localeMeta.nativeName}?`)) return;

    setRunning(true);
    setProgress({ done: 0, total: publishedTools.length });

    let successCount = 0;
    let errorCount = 0;

    for (const tool of publishedTools) {
      try {
        const { data, error } = await supabase.functions.invoke("translate-tool", {
          body: { tool_id: tool.id, locale: batchLocale },
        });
        if (error || data?.error) throw error || new Error(data?.error);
        successCount++;
      } catch {
        errorCount++;
      }
      setProgress(prev => ({ ...prev, done: prev.done + 1 }));
      await new Promise(r => setTimeout(r, 1500));
    }

    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["admin-tools-translation-map"] });
    toast.success(`Hoàn tất: ${successCount} thành công, ${errorCount} lỗi`);
  };

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-2" align="end">
          <p className="text-xs font-medium">Dịch hàng loạt</p>
          <Select value={batchLocale} onValueChange={(v) => setBatchLocale(v as Locale)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full" onClick={handleBatchTranslate} disabled={running}>
            {running ? `${progress.done}/${progress.total}` : "Bắt đầu dịch"}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={batchLocale} onValueChange={(v) => setBatchLocale(v as Locale)}>
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TARGET_LOCALES.map(([code, meta]) => (
            <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={handleBatchTranslate} disabled={running}>
        {running ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <Languages className="mr-1 h-3.5 w-3.5" /> Dịch hàng loạt
          </>
        )}
      </Button>
    </div>
  );
}

function GenerateAIScoreButton({ toolId, toolName }: { toolId: string; toolName: string }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-score", {
        body: { tool_id: toolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Đã tạo AI Score cho ${toolName}`);
      queryClient.invalidateQueries({ queryKey: ["tool"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo AI Score");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleGenerate} disabled={generating} title="Tạo AI Score">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
    </Button>
  );
}
