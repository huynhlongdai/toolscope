import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Sparkles, Loader2, ExternalLink, Trash2, Download, Zap } from "lucide-react";
import type { useCollectAI } from "./useCollectAI";

type StagingTabProps = ReturnType<typeof useCollectAI>;

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "secondary", label: "Chờ duyệt" },
    approved: { variant: "default", label: "Đã duyệt" },
    rejected: { variant: "destructive", label: "Từ chối" },
    imported: { variant: "outline", label: "Đã import" },
  };
  const s = map[status] || { variant: "secondary" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function StagingTab(props: StagingTabProps) {
  const {
    items, itemsLoading, sessions, categories,
    filterStatus, setFilterStatus, filterSession, setFilterSession,
    selectedItems, toggleSelect, toggleSelectAll,
    pendingItems, approvedItems,
    importCategory, setImportCategory,
    itemCategoryOverrides, setItemCategoryOverrides,
    updateStatusMutation, importMutation, enrichMutation,
    batchEnrichMutation, deleteMutation,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
              <SelectItem value="imported">Đã import</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tất cả phiên" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phiên</SelectItem>
              {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.query.slice(0, 30)} ({s.results_count})</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>
        <div className="flex gap-2">
          {pendingItems.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => batchEnrichMutation.mutate()} disabled={batchEnrichMutation.isPending}>
              {batchEnrichMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Auto-Enrich ({pendingItems.length})
            </Button>
          )}
          {selectedItems.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ ids: [...selectedItems], status: "approved" })}>
                <CheckCircle className="h-4 w-4 mr-1" /> Duyệt ({selectedItems.size})
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ ids: [...selectedItems], status: "rejected" })}>
                <XCircle className="h-4 w-4 mr-1" /> Từ chối
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate([...selectedItems])}>
                <Trash2 className="h-4 w-4 mr-1" /> Xóa
              </Button>
            </>
          )}
        </div>
      </div>

      {approvedItems.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-sm font-medium">{approvedItems.length} item đã duyệt, sẵn sàng import</span>
            <Select value={importCategory} onValueChange={setImportCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Chọn danh mục đích" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không chọn</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => importMutation.mutate(approvedItems.map(i => i.id))} disabled={importMutation.isPending}>
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Import tất cả đã duyệt
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedItems.size === items.length && items.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-24">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu. Hãy tìm kiếm để thu thập.</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} className={selectedItems.has(item.id) ? "bg-muted/50" : ""}>
                <TableCell><Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></TableCell>
                <TableCell>
                  {item.logo_url ? <img src={item.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                    : item.website_url ? <img src={`https://www.google.com/s2/favicons?domain=${item.website_url}&sz=32`} alt="" className="h-8 w-8" />
                    : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">{item.name?.[0]}</div>}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{item.name}</div>
                  {item.website_url && (
                    <a href={item.website_url} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
                      {item.website_url.replace(/^https?:\/\//, "").slice(0, 30)} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]"><p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p></TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{item.pricing_type}</Badge></TableCell>
                <TableCell className="min-w-[180px]">
                  {(() => {
                    const catName = item.category_name?.trim().toLowerCase() || "";
                    const catSlug = catName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                    const matched = catName ? categories.find(c => c.name.toLowerCase() === catName || c.slug === catSlug) : null;
                    const overrideId = itemCategoryOverrides[item.id];
                    const overrideCat = overrideId ? categories.find(c => c.id === overrideId) : null;

                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{item.category_name || "—"}</span>
                          {item.category_name && (
                            matched
                              ? <Badge variant="default" className="text-[10px] px-1.5 py-0">✓ Match</Badge>
                              : <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Mới</Badge>
                          )}
                        </div>
                        {overrideCat && <span className="text-[10px] text-primary">→ {overrideCat.name}</span>}
                        <Select
                          value={overrideId || "__auto"}
                          onValueChange={(v) => setItemCategoryOverrides(prev => {
                            const next = { ...prev };
                            if (v === "__auto") { delete next[item.id]; } else { next[item.id] = v; }
                            return next;
                          })}
                        >
                          <SelectTrigger className="h-6 text-[10px] w-full">
                            <SelectValue placeholder="Tự động" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto">Tự động</SelectItem>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>{statusBadge(item.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Làm giàu dữ liệu" onClick={() => enrichMutation.mutate(item.id)} disabled={enrichMutation.isPending}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    {item.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => updateStatusMutation.mutate({ ids: [item.id], status: "approved" })}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatusMutation.mutate({ ids: [item.id], status: "rejected" })}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
