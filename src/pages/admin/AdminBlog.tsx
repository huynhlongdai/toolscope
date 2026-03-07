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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Sparkles, RefreshCw, Download, ChevronLeft, ChevronRight, Languages } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";
import { EntityTranslationEditor } from "@/components/admin/translations/EntityTranslationEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [editPost, setEditPost] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*, profiles!blog_posts_author_id_fkey(display_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status: status as any };
      if (status === "published") update.published_at = new Date().toISOString();
      const { error } = await supabase.from("blog_posts").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      logAuditAction("blog_status_change", "blog_post", vars.id, { status: vars.status });
      toast.success("Đã cập nhật");
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      logAuditAction("blog_delete", "blog_post", id);
      toast.success("Đã xóa");
    },
  });

  const filtered = posts.filter((p: any) => p.title.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const headers = ["Title", "Slug", "Author", "Status", "Views", "Created"];
    const rows = filtered.map((p: any) => [p.title, p.slug, p.profiles?.display_name ?? "", p.status, p.view_count, new Date(p.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "blog-posts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Blog</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={() => setShowAIDialog(true)}>
              <Sparkles className="mr-1 h-3.5 w-3.5" /> AI
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Tạo</Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm bài viết..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có bài viết</TableCell></TableRow>
              ) : (
                paged.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">{p.title}</TableCell>
                    <TableCell>{p.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}>
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{p.view_count}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditPost(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa?")) deletePost.mutate(p.id); }}>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages} ({filtered.length} posts)</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}

        {(editPost || showAdd) && (
          <BlogFormDialog post={editPost} open={!!editPost || showAdd} onClose={() => { setEditPost(null); setShowAdd(false); }} userId={user?.id} />
        )}

        {showAIDialog && (
          <AIWriteDialog open={showAIDialog} onClose={() => setShowAIDialog(false)} onGenerated={(data) => {
            setShowAIDialog(false);
            setEditPost({
              title: data.title,
              slug: data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
              excerpt: data.excerpt,
              content: data.content,
              tags: data.tags,
              seo_title: data.seo_title,
              seo_description: data.seo_description,
              seo_keywords: data.seo_keywords,
              _isNew: true,
            });
          }} />
        )}
      </div>
    </AdminLayout>
  );
}

/* ---------- AI Write Dialog ---------- */
function AIWriteDialog({ open, onClose, onGenerated }: { open: boolean; onClose: () => void; onGenerated: (data: any) => void }) {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("guide");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Nhập chủ đề bài viết"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post", {
        body: { action: "generate", topic, type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onGenerated(data);
      toast.success("AI đã tạo bài viết!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo bài viết");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Viết bài bằng AI</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chủ đề / Keyword</Label>
            <Input placeholder='VD: "Top 10 AI Design Tools 2026"' value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kiểu bài viết</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="listicle">Listicle (Top N...)</SelectItem>
                <SelectItem value="comparison">So sánh</SelectItem>
                <SelectItem value="guide">Hướng dẫn</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="news">Tin tức / Xu hướng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang viết...</> : <><Sparkles className="mr-2 h-4 w-4" /> Tạo bài viết</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Blog Form Dialog ---------- */
function BlogFormDialog({ post, open, onClose, userId }: { post: any; open: boolean; onClose: () => void; userId?: string }) {
  const queryClient = useQueryClient();
  const isNew = !post?.id || post?._isNew;
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    tags: Array.isArray(post?.tags) ? post.tags.join(", ") : (post?.tags ?? ""),
    content: post?.content ?? "",
    status: post?.status ?? "draft",
    seo_title: post?.seo_title ?? "",
    seo_description: post?.seo_description ?? "",
    seo_keywords: Array.isArray(post?.seo_keywords) ? post.seo_keywords.join(", ") : (post?.seo_keywords ?? ""),
    related_tool_ids: (post?.related_tool_ids as string[]) ?? [],
  });

  const { data: allTools = [] } = useQuery({
    queryKey: ["all-tools-for-blog"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name, slug, logo_url, website_url, pricing_type").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const [toolSearch, setToolSearch] = useState("");

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAutoSEO = async () => {
    if (!form.content && !form.title) { toast.error("Cần có tiêu đề hoặc nội dung"); return; }
    setAiLoading("seo");
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post", {
        body: { action: "generate_seo", title: form.title, content: form.content },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateField("seo_title", data.seo_title || "");
      updateField("seo_description", data.seo_description || "");
      if (data.seo_keywords) updateField("seo_keywords", data.seo_keywords.join(", "));
      if (data.suggested_tags && !form.tags) updateField("tags", data.suggested_tags.join(", "));
      toast.success("Đã tạo SEO metadata!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo SEO");
    } finally {
      setAiLoading(null);
    }
  };

  const handleAutoExcerpt = async () => {
    if (!form.content) { toast.error("Cần có nội dung"); return; }
    setAiLoading("excerpt");
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post", {
        body: { action: "generate_excerpt", content: form.content },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateField("excerpt", data.excerpt || "");
      toast.success("Đã tạo excerpt!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo excerpt");
    } finally {
      setAiLoading(null);
    }
  };

  const handleSuggestTools = async () => {
    if (!form.content && !form.title) { toast.error("Cần có tiêu đề hoặc nội dung"); return; }
    setAiLoading("suggest_tools");
    try {
      const toolsList = JSON.stringify(allTools.map((t: any) => ({ id: t.id, name: t.name })));
      const { data, error } = await supabase.functions.invoke("generate-blog-post", {
        body: { action: "suggest_tools", title: form.title, content: form.content, tools_list: toolsList },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ids = (data.tool_ids || []).filter((id: string) => allTools.some((t: any) => t.id === id));
      if (ids.length) {
        updateField("related_tool_ids", [...new Set([...form.related_tool_ids, ...ids])]);
        toast.success(`AI gợi ý ${ids.length} tools!`);
      } else {
        toast.info("Không tìm thấy tool phù hợp");
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi gợi ý tools");
    } finally {
      setAiLoading(null);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error("Tiêu đề và slug là bắt buộc"); return; }
    if (!userId) { toast.error("Cần đăng nhập"); return; }
    setSaving(true);

    const payload: any = {
      title: form.title, slug: form.slug, excerpt: form.excerpt || null,
      cover_image_url: form.cover_image_url || null,
      tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      content: form.content, status: form.status as any,
      related_tool_ids: form.related_tool_ids.length > 0 ? form.related_tool_ids : null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      seo_keywords: form.seo_keywords ? form.seo_keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : null,
    };
    if (form.status === "published" && !post?.published_at) payload.published_at = new Date().toISOString();

    if (!isNew && post?.id) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã cập nhật");
    } else {
      const { error } = await supabase.from("blog_posts").insert({ ...payload, author_id: userId });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Đã tạo bài viết");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Tạo bài viết mới" : "Chỉnh sửa bài viết"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input value={form.title} onChange={(e) => { updateField("title", e.target.value); if (isNew) updateField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Excerpt</Label>
              <Button variant="ghost" size="sm" onClick={handleAutoExcerpt} disabled={!!aiLoading}>
                {aiLoading === "excerpt" ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                Tạo tự động
              </Button>
            </div>
            <Input value={form.excerpt} onChange={(e) => updateField("excerpt", e.target.value)} />
          </div>

          <CoverImageUpload value={form.cover_image_url} onChange={(v) => updateField("cover_image_url", v)} />

          <div className="space-y-2">
            <Label>Tags (phẩy phân cách)</Label>
            <Input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Nội dung</Label>
            <RichTextEditor content={form.content} onChange={(v) => updateField("content", v)} placeholder="Viết nội dung bài blog..." />
          </div>

          {/* Related Tools */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">🔗 Đính kèm Tools</h3>
              <Button variant="ghost" size="sm" onClick={handleSuggestTools} disabled={!!aiLoading}>
                {aiLoading === "suggest_tools" ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                AI gợi ý
              </Button>
            </div>
            <Input placeholder="Tìm tool..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="h-8" />
            {toolSearch && (
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2 bg-background">
                {allTools.filter((t: any) => t.name.toLowerCase().includes(toolSearch.toLowerCase()) && !form.related_tool_ids.includes(t.id)).slice(0, 10).map((t: any) => (
                  <button key={t.id} type="button" className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm" onClick={() => { updateField("related_tool_ids", [...form.related_tool_ids, t.id]); setToolSearch(""); }}>
                    <span className="font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
            {form.related_tool_ids.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.related_tool_ids.map((id: string) => {
                  const tool = allTools.find((t: any) => t.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {tool?.name || id.slice(0, 8)}
                      <button type="button" className="ml-1 hover:text-destructive" onClick={() => updateField("related_tool_ids", form.related_tool_ids.filter((x: string) => x !== id))}>×</button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEO Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">🔍 SEO Metadata</h3>
              <Button variant="outline" size="sm" onClick={handleAutoSEO} disabled={!!aiLoading}>
                {aiLoading === "seo" ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                Tạo SEO tự động
              </Button>
            </div>
            <div className="space-y-2">
              <Label>SEO Title <span className="text-muted-foreground text-xs">({form.seo_title.length}/60)</span></Label>
              <Input value={form.seo_title} onChange={(e) => updateField("seo_title", e.target.value)} placeholder="Tiêu đề tối ưu cho SEO" maxLength={70} />
            </div>
            <div className="space-y-2">
              <Label>SEO Description <span className="text-muted-foreground text-xs">({form.seo_description.length}/160)</span></Label>
              <Input value={form.seo_description} onChange={(e) => updateField("seo_description", e.target.value)} placeholder="Mô tả meta cho công cụ tìm kiếm" maxLength={170} />
            </div>
            <div className="space-y-2">
              <Label>SEO Keywords (phẩy phân cách)</Label>
              <Input value={form.seo_keywords} onChange={(e) => updateField("seo_keywords", e.target.value)} placeholder="keyword1, keyword2, ..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
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
