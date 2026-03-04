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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ExternalLink, Star, Eye, MessageSquare, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { marked } from "marked";

export default function AdminTools() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editTool, setEditTool] = useState<any>(null);
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
          <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Thêm Tool</Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
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

function ToolFormDialog({ tool, open, onClose }: { tool: any; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillQuery, setAutoFillQuery] = useState("");

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

  // Reviews & Q&A for existing tools
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

  // Related tools search
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

  // Fake review form
  const [fakeReview, setFakeReview] = useState({ title: "", content: "" });
  const [fakeQuestion, setFakeQuestion] = useState({ title: "", content: "" });
  const [fakeAnswer, setFakeAnswer] = useState({ questionId: "", content: "" });

  // Pricing plan form
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

      // Map results to form
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
      }));

      // Try to match category
      if (data.category_suggestion && categories.length > 0) {
        const suggestion = data.category_suggestion.toLowerCase();
        const match = categories.find((c: any) => c.name.toLowerCase().includes(suggestion) || suggestion.includes(c.name.toLowerCase()));
        if (match) updateField("category_id", match.id);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Chỉnh sửa Tool" : "Thêm Tool mới"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="stats">Fake Stats</TabsTrigger>
            <TabsTrigger value="reviews">Reviews & Q&A</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="seo">Gợi ý & SEO</TabsTrigger>
          </TabsList>

          {/* Tab: Basic */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Auto-fill Card */}
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Thu thập tự động bằng AI</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tên tool (VD: Figma) hoặc URL (VD: https://figma.com)"
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Website URL</Label><Input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} /></div>
              <div className="space-y-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => updateField("logo_url", e.target.value)} /></div>
              <div className="space-y-2"><Label>Affiliate URL</Label><Input value={form.affiliate_url} onChange={(e) => updateField("affiliate_url", e.target.value)} /></div>
            </div>
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
            {tool?.id && (
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t: any) => (
                    <Button key={t.id} type="button" variant={toolTags.includes(t.id) ? "default" : "outline"} size="sm" onClick={() => toggleTag(t.id)}>{t.name}</Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Content */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <ContentTabWithPreview form={form} updateField={updateField} toolName={form.name} />
          </TabsContent>

          {/* Tab: Fake Stats */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" /> Fake Rating & Views</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
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
                {/* Fake Reviews */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Reviews ({reviews.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{r.title}</span>
                            {r.is_editor_review && <Badge variant="secondary" className="text-[10px]">Editor</Badge>}
                            <Badge variant={r.status === "published" ? "default" : "outline"} className="text-[10px]">{r.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.content}</p>
                        </div>
                        <div className="flex gap-1">
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

                {/* Fake Q&A */}
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
                  <div className="grid grid-cols-3 gap-2">
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
                <p className="text-sm text-green-700">{window.location.origin}/tool/{form.slug || "slug"}</p>
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
        <div className="space-y-6 rounded-lg border p-6 bg-background">
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
