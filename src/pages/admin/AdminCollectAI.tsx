import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Globe, Download, CheckCircle, XCircle, Sparkles, History, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CollectItem = {
  id: string;
  session_id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  pricing_type: string | null;
  category_name: string | null;
  source_url: string | null;
  status: string;
  imported_tool_id: string | null;
  created_at: string;
};

type CollectSession = {
  id: string;
  search_type: string;
  query: string;
  results_count: number;
  status: string;
  created_at: string;
  metadata: any;
};

export default function AdminCollectAI() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"keyword" | "url">("keyword");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [importCategory, setImportCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("search");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").order("name");
      return data || [];
    },
  });

  // Fetch sessions history
  const { data: sessions = [] } = useQuery({
    queryKey: ["collect-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collect_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as CollectSession[];
    },
  });

  // Fetch staging items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["collect-items", filterStatus, filterSession],
    queryFn: async () => {
      let q = supabase.from("collect_items").select("*").order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (filterSession !== "all") q = q.eq("session_id", filterSession);
      const { data } = await q.limit(200);
      return (data || []) as CollectItem[];
    },
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async () => {
      const catName = categories.find(c => c.id === selectedCategory)?.name;
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: {
          action: "search",
          query: searchQuery,
          search_type: searchType,
          category_id: selectedCategory || undefined,
          category_name: catName || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Tìm thấy ${data.tools_count} công cụ`);
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      queryClient.invalidateQueries({ queryKey: ["collect-sessions"] });
      setActiveTab("staging");
    },
    onError: (e: any) => toast.error(e.message || "Lỗi tìm kiếm"),
  });

  // Approve/Reject mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("collect_items")
        .update({ status, reviewed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      setSelectedItems(new Set());
      toast.success("Cập nhật trạng thái thành công");
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: { action: "import", item_ids: itemIds, target_category_id: importCategory || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const imported = data.results?.filter((r: any) => r.status === "imported").length || 0;
      const dupes = data.results?.filter((r: any) => r.status === "duplicate").length || 0;
      toast.success(`Import: ${imported} thành công, ${dupes} trùng lặp`);
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      setSelectedItems(new Set());
    },
    onError: (e: any) => toast.error(e.message || "Lỗi import"),
  });

  // Enrich mutation
  const enrichMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.functions.invoke("collect-ai", {
        body: { action: "enrich", item_id: itemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      toast.success("Đã làm giàu dữ liệu");
    },
  });

  // Delete items
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("collect_items").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collect-items"] });
      setSelectedItems(new Set());
      toast.success("Đã xóa");
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Chờ duyệt" },
      approved: { variant: "default", label: "Đã duyệt" },
      rejected: { variant: "destructive", label: "Từ chối" },
      imported: { variant: "outline", label: "Đã import" },
    };
    const s = map[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const pendingItems = items.filter(i => i.status === "pending");
  const approvedItems = items.filter(i => i.status === "approved");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CollectAI</h1>
          <p className="text-muted-foreground">Thu thập, quản lý và import công cụ AI tự động</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="search" className="gap-1"><Search className="h-4 w-4" /> Tìm kiếm</TabsTrigger>
            <TabsTrigger value="staging" className="gap-1"><Download className="h-4 w-4" /> Staging ({pendingItems.length + approvedItems.length})</TabsTrigger>
            <TabsTrigger value="history" className="gap-1"><History className="h-4 w-4" /> Lịch sử</TabsTrigger>
          </TabsList>

          {/* === SEARCH TAB === */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tìm kiếm công cụ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={searchType} onValueChange={(v: "keyword" | "url") => setSearchType(v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword"><Search className="inline h-3 w-3 mr-1" />Theo keyword</SelectItem>
                      <SelectItem value="url"><Globe className="inline h-3 w-3 mr-1" />Theo URL</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={searchType === "keyword" ? "VD: AI writing tools, project management..." : "VD: https://www.producthunt.com/topics/artificial-intelligence"}
                    className="flex-1"
                    onKeyDown={e => e.key === "Enter" && searchQuery && searchMutation.mutate()}
                  />
                  <Button onClick={() => searchMutation.mutate()} disabled={!searchQuery || searchMutation.isPending}>
                    {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                    Thu thập
                  </Button>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Danh mục:</span>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {searchMutation.isPending && (
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">Đang tìm kiếm và phân tích dữ liệu với AI...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === STAGING TAB === */}
          <TabsContent value="staging" className="space-y-4">
            {/* Filters & Actions */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2 items-center">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="pending">Chờ duyệt</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="rejected">Từ chối</SelectItem>
                    <SelectItem value="imported">Đã import</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSession} onValueChange={setFilterSession}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Tất cả phiên" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả phiên</SelectItem>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.query.slice(0, 30)} ({s.results_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{items.length} items</span>
              </div>
              <div className="flex gap-2">
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

            {/* Import bar for approved items */}
            {approvedItems.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-sm font-medium">{approvedItems.length} item đã duyệt, sẵn sàng import</span>
                  <Select value={importCategory} onValueChange={setImportCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Chọn danh mục đích" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không chọn</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => importMutation.mutate(approvedItems.map(i => i.id))}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                    Import tất cả đã duyệt
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Items table */}
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selectedItems.size === items.length && items.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
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
                      <TableCell>
                        <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                      <TableCell>
                        {item.logo_url ? (
                          <img src={item.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                        ) : item.website_url ? (
                          <img src={`https://www.google.com/s2/favicons?domain=${item.website_url}&sz=32`} alt="" className="h-8 w-8" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">{item.name?.[0]}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{item.name}</div>
                        {item.website_url && (
                          <a href={item.website_url} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
                            {item.website_url.replace(/^https?:\/\//, "").slice(0, 30)} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{item.pricing_type}</Badge></TableCell>
                      <TableCell className="text-xs">{item.category_name}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Làm giàu dữ liệu"
                            onClick={() => enrichMutation.mutate(item.id)}
                            disabled={enrichMutation.isPending}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </Button>
                          {item.status === "pending" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateStatusMutation.mutate({ ids: [item.id], status: "approved" })}>
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
          </TabsContent>

          {/* === HISTORY TAB === */}
          <TabsContent value="history" className="space-y-4">
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Truy vấn</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có lịch sử</TableCell></TableRow>
                  ) : sessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.search_type === "keyword" ? "Keyword" : "URL"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm truncate">{s.query}</p>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{s.results_count} tools</Badge></TableCell>
                      <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setFilterSession(s.id); setActiveTab("staging"); }}>
                          Xem items
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
