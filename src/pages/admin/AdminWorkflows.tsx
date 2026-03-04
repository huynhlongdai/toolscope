import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X, Sparkles, Loader2, ExternalLink, Video } from "lucide-react";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";

export default function AdminWorkflows() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editWf, setEditWf] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflows").select("*, profiles(display_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-workflows"] }); toast.success("Đã xóa"); },
  });

  const filtered = workflows.filter((w: any) => w.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Workflows</h1>
          <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Tạo Workflow</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có workflow</TableCell></TableRow>
              ) : (
                filtered.map((wf: any) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">{wf.title}</TableCell>
                    <TableCell>{wf.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={wf.status === "published" ? "default" : "secondary"} className="text-xs">{wf.status}</Badge>
                    </TableCell>
                    <TableCell>{wf.tool_ids?.length || 0}</TableCell>
                    <TableCell>{(wf.steps as any[])?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditWf(wf)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deleteMut.mutate(wf.id); }}>
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

        {(editWf || showAdd) && (
          <WorkflowFormDialog wf={editWf} open={!!editWf || showAdd} onClose={() => { setEditWf(null); setShowAdd(false); }} userId={user?.id} />
        )}
      </div>
    </AdminLayout>
  );
}

function WorkflowFormDialog({ wf, open, onClose, userId }: { wf: any; open: boolean; onClose: () => void; userId?: string }) {
  const queryClient = useQueryClient();
  const isNew = !wf?.id;
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiMode, setAiMode] = useState<"keyword" | "suggest">("keyword");
  const [suggestedVideos, setSuggestedVideos] = useState<{ search_query: string; title: string; reason: string }[]>([]);

  const seoContentDefault = wf?.seo_content || {};

  const [form, setForm] = useState({
    title: wf?.title ?? "",
    slug: wf?.slug ?? "",
    description: wf?.description ?? "",
    category: wf?.category ?? "",
    cover_image_url: wf?.cover_image_url ?? "",
    status: wf?.status ?? "draft",
    tool_ids: (wf?.tool_ids as string[]) ?? [],
    steps: ((wf?.steps as any[]) ?? [{ title: "", description: "", tool_id: null }]),
    video_url: wf?.video_url ?? "",
    seo_title: wf?.seo_title ?? "",
    seo_description: wf?.seo_description ?? "",
    seo_content: {
      problem: seoContentDefault.problem ?? "",
      solution: seoContentDefault.solution ?? "",
      common_mistakes: seoContentDefault.common_mistakes ?? [],
      tips: seoContentDefault.tips ?? [],
      prerequisites: seoContentDefault.prerequisites ?? [],
      target_audience: seoContentDefault.target_audience ?? "",
      use_cases: seoContentDefault.use_cases ?? [],
      estimated_time: seoContentDefault.estimated_time ?? "",
      difficulty_level: seoContentDefault.difficulty_level ?? "beginner",
    },
  });

  const { data: allTools = [] } = useQuery({
    queryKey: ["all-tools-wf"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const [toolSearch, setToolSearch] = useState("");
  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const updateSeo = (key: string, value: any) => setForm(prev => ({ ...prev, seo_content: { ...prev.seo_content, [key]: value } }));

  const addStep = () => update("steps", [...form.steps, { title: "", description: "", tool_id: null }]);
  const removeStep = (i: number) => update("steps", form.steps.filter((_: any, idx: number) => idx !== i));
  const updateStep = (i: number, key: string, value: any) => {
    const s = [...form.steps];
    s[i] = { ...s[i], [key]: value };
    update("steps", s);
  };

  const handleAiGenerate = async () => {
    if (aiMode === "keyword" && !aiKeyword.trim()) {
      toast.error("Nhập keyword để tạo workflow");
      return;
    }
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workflow", {
        body: {
          keyword: aiKeyword.trim() || null,
          tool_ids: form.tool_ids.length > 0 ? form.tool_ids : null,
          mode: aiMode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        slug: data.slug || prev.slug,
        description: data.description || prev.description,
        category: data.category || prev.category,
        seo_title: data.seo_title || prev.seo_title,
        seo_description: data.seo_description || prev.seo_description,
        steps: data.steps?.length > 0 ? data.steps : prev.steps,
        tool_ids: data.tool_ids?.length > 0 ? [...new Set([...prev.tool_ids, ...data.tool_ids])] : prev.tool_ids,
        seo_content: data.seo_content ? { ...prev.seo_content, ...data.seo_content } : prev.seo_content,
      }));
      if (data.suggested_videos?.length) {
        setSuggestedVideos(data.suggested_videos);
      }
      toast.success("AI đã tạo workflow + SEO content thành công!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo workflow bằng AI");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error("Tiêu đề và slug là bắt buộc"); return; }
    if (!userId) { toast.error("Cần đăng nhập"); return; }
    setSaving(true);

    const payload: any = {
      title: form.title, slug: form.slug, description: form.description || null,
      category: form.category || null, cover_image_url: form.cover_image_url || null,
      status: form.status as any,
      tool_ids: form.tool_ids.length > 0 ? form.tool_ids : [],
      steps: form.steps.filter((s: any) => s.title),
      video_url: form.video_url || null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      seo_content: form.seo_content,
    };

    if (isNew) {
      const { error } = await supabase.from("workflows").insert({ ...payload, author_id: userId } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã tạo workflow");
    } else {
      const { error } = await supabase.from("workflows").update(payload as any).eq("id", wf.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    setSaving(false);
    onClose();
  };

  // Helper for list fields
  const addListItem = (key: string, item: any) => {
    const list = (form.seo_content as any)[key] || [];
    updateSeo(key, [...list, item]);
  };
  const removeListItem = (key: string, idx: number) => {
    const list = (form.seo_content as any)[key] || [];
    updateSeo(key, list.filter((_: any, i: number) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Tạo Workflow mới" : "Chỉnh sửa Workflow"}</DialogTitle></DialogHeader>

        {/* AI Generate Card */}
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Tạo workflow + SEO content bằng AI</span>
            </div>
            <div className="flex gap-2 mb-2">
              <Select value={aiMode} onValueChange={(v: any) => setAiMode(v)}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Theo keyword</SelectItem>
                  <SelectItem value="suggest">Gợi ý từ tools</SelectItem>
                </SelectContent>
              </Select>
              {aiMode === "keyword" && (
                <Input
                  placeholder="VD: Tạo video marketing bằng AI..."
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !aiGenerating && handleAiGenerate()}
                  disabled={aiGenerating}
                  className="h-9"
                />
              )}
              <Button onClick={handleAiGenerate} disabled={aiGenerating} className="shrink-0 h-9">
                {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {aiGenerating ? "Đang tạo..." : "Tạo"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              AI tạo workflow hoàn chỉnh kèm: vấn đề & giải pháp, bước thực hiện, lỗi thường gặp, tips, SEO metadata
              {form.tool_ids.length > 0 && " • Ưu tiên tools đã chọn"}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
            <TabsTrigger value="steps">Steps & Tools</TabsTrigger>
            <TabsTrigger value="seo-content">Nội dung SEO</TabsTrigger>
            <TabsTrigger value="seo-meta">SEO & Media</TabsTrigger>
          </TabsList>

          {/* Tab: Basic */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tiêu đề *</Label>
                <Input value={form.title} onChange={(e) => { update("title", e.target.value); if (isNew) update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="VD: Design, Marketing..." />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CoverImageUpload value={form.cover_image_url} onChange={(v) => update("cover_image_url", v)} />
          </TabsContent>

          {/* Tab: Steps & Tools */}
          <TabsContent value="steps" className="space-y-4 mt-4">
            {/* Tools */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">🔗 Tools trong Workflow</h3>
              <Input placeholder="Tìm tool..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="h-8" />
              {toolSearch && (
                <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2 bg-background">
                  {allTools.filter((t: any) => t.name.toLowerCase().includes(toolSearch.toLowerCase()) && !form.tool_ids.includes(t.id)).slice(0, 8).map((t: any) => (
                    <button key={t.id} type="button" className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-muted text-sm" onClick={() => { update("tool_ids", [...form.tool_ids, t.id]); setToolSearch(""); }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              {form.tool_ids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tool_ids.map((id: string) => {
                    const tool = allTools.find((t: any) => t.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {tool?.name || id.slice(0, 8)}
                        <button type="button" className="ml-1 hover:text-destructive" onClick={() => update("tool_ids", form.tool_ids.filter((x: string) => x !== id))}>×</button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">📋 Các bước thực hiện</h3>
                <Button variant="outline" size="sm" onClick={addStep}><Plus className="mr-1 h-3 w-3" /> Thêm bước</Button>
              </div>
              {form.steps.map((step: any, i: number) => (
                <div key={i} className="border rounded p-3 space-y-2 bg-background">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Bước {i + 1}</span>
                    {form.steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)} className="text-destructive hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <Input placeholder="Tiêu đề bước" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} className="h-8" />
                  <Textarea placeholder="Mô tả chi tiết..." value={step.description} onChange={(e) => updateStep(i, "description", e.target.value)} rows={2} className="text-sm" />
                  <Select value={step.tool_id || "__none"} onValueChange={(v) => updateStep(i, "tool_id", v === "__none" ? null : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn tool (tùy chọn)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Không chọn tool</SelectItem>
                      {allTools.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab: SEO Content */}
          <TabsContent value="seo-content" className="space-y-4 mt-4">
            {/* Problem & Solution */}
            <div className="space-y-2">
              <Label>🎯 Vấn đề cần giải quyết</Label>
              <Textarea value={form.seo_content.problem} onChange={(e) => updateSeo("problem", e.target.value)} rows={3} placeholder="Mô tả pain point mà workflow này giải quyết..." />
            </div>
            <div className="space-y-2">
              <Label>💡 Giải pháp</Label>
              <Textarea value={form.seo_content.solution} onChange={(e) => updateSeo("solution", e.target.value)} rows={3} placeholder="Workflow này giải quyết vấn đề như thế nào..." />
            </div>

            {/* Target Audience & Use Cases */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>👥 Đối tượng mục tiêu</Label>
                <Input value={form.seo_content.target_audience} onChange={(e) => updateSeo("target_audience", e.target.value)} placeholder="VD: Content creators, Marketers..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>⏱️ Thời gian</Label>
                  <Input value={form.seo_content.estimated_time} onChange={(e) => updateSeo("estimated_time", e.target.value)} placeholder="VD: 30 phút" />
                </div>
                <div className="space-y-2">
                  <Label>📊 Độ khó</Label>
                  <Select value={form.seo_content.difficulty_level} onValueChange={(v) => updateSeo("difficulty_level", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Prerequisites */}
            <ListEditor
              label="📋 Điều kiện tiên quyết"
              items={form.seo_content.prerequisites}
              onAdd={(v) => addListItem("prerequisites", v)}
              onRemove={(i) => removeListItem("prerequisites", i)}
            />

            {/* Use Cases */}
            <ListEditor
              label="🎯 Use Cases"
              items={form.seo_content.use_cases}
              onAdd={(v) => addListItem("use_cases", v)}
              onRemove={(i) => removeListItem("use_cases", i)}
            />

            {/* Common Mistakes */}
            <TitledListEditor
              label="⚠️ Lỗi thường gặp"
              items={form.seo_content.common_mistakes}
              onAdd={(item) => addListItem("common_mistakes", item)}
              onRemove={(i) => removeListItem("common_mistakes", i)}
            />

            {/* Tips */}
            <TitledListEditor
              label="💡 Pro Tips"
              items={form.seo_content.tips}
              onAdd={(item) => addListItem("tips", item)}
              onRemove={(i) => removeListItem("tips", i)}
            />
          </TabsContent>

          {/* Tab: SEO & Media */}
          <TabsContent value="seo-meta" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>SEO Title <span className="text-xs text-muted-foreground">({form.seo_title.length}/60)</span></Label>
              <Input value={form.seo_title} onChange={(e) => update("seo_title", e.target.value)} placeholder="Tiêu đề tối ưu SEO..." maxLength={70} />
            </div>
            <div className="space-y-2">
              <Label>SEO Description <span className="text-xs text-muted-foreground">({form.seo_description.length}/160)</span></Label>
              <Textarea value={form.seo_description} onChange={(e) => update("seo_description", e.target.value)} rows={2} placeholder="Meta description..." maxLength={170} />
            </div>
            <div className="space-y-2">
              <Label>🎬 Video URL (YouTube)</Label>
              <Input value={form.video_url} onChange={(e) => update("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              {form.video_url && form.video_url.includes("youtu") && (
                <div className="aspect-video rounded-lg overflow-hidden border mt-2">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(form.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Preview"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper: extract YouTube video ID
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? "";
}

// Simple list editor (string items)
function ListEditor({ label, items, onAdd, onRemove }: { label: string; items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void }) {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Thêm mục..." className="h-8"
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onAdd(input.trim()); setInput(""); } }} />
        <Button type="button" variant="outline" size="sm" onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(""); } }}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1 text-xs">
              {item}
              <button type="button" onClick={() => onRemove(i)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Title+Description list editor
function TitledListEditor({ label, items, onAdd, onRemove }: { label: string; items: { title: string; description: string }[]; onAdd: (item: { title: string; description: string }) => void; onRemove: (i: number) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề..." className="h-8 flex-1" />
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả..." className="h-8 flex-[2]" />
        <Button type="button" variant="outline" size="sm" onClick={() => { if (title.trim()) { onAdd({ title: title.trim(), description: desc.trim() }); setTitle(""); setDesc(""); } }}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded border p-2 bg-background text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.title}</span>
                {item.description && <span className="text-muted-foreground"> — {item.description}</span>}
              </div>
              <button type="button" onClick={() => onRemove(i)} className="text-destructive hover:text-destructive/80 shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
