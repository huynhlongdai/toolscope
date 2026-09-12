import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { RichTextEditor, clearAutosaveDraft } from "@/components/admin/RichTextEditor";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";
import { EntityTranslationEditor } from "@/components/admin/translations/EntityTranslationEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Sparkles, RefreshCw, Languages } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminBlogEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const isNew = !id || id === "new";

  const [form, setForm] = useState({
    title: searchParams.get("title") || "",
    slug: searchParams.get("slug") || "",
    excerpt: searchParams.get("excerpt") || "",
    cover_image_url: "",
    tags: searchParams.get("tags") || "",
    content: searchParams.get("content") || "",
    status: isNew && !isAdmin ? "pending_review" : "draft",
    seo_title: searchParams.get("seo_title") || "",
    seo_description: searchParams.get("seo_description") || "",
    seo_keywords: searchParams.get("seo_keywords") || "",
    related_tool_ids: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState("");

  // Fetch all published tools for related tools selector
  const { data: allTools = [] } = useQuery({
    queryKey: ["all-tools-for-blog"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name, slug, logo_url, website_url, pricing_type").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post-edit", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        cover_image_url: post.cover_image_url || "",
        tags: Array.isArray(post.tags) ? post.tags.join(", ") : (post.tags || ""),
        content: post.content || "",
        status: post.status || "draft",
        seo_title: post.seo_title || "",
        seo_description: post.seo_description || "",
        seo_keywords: Array.isArray(post.seo_keywords) ? post.seo_keywords.join(", ") : (post.seo_keywords || ""),
        related_tool_ids: (post.related_tool_ids as string[]) || [],
      });
    }
  }, [post]);

  const updateField = (key: string, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "title" && isNew && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return updated;
    });
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

  const handleAutoSEO = async () => {
    if (!form.content && !form.title) {
      toast.error("Cần có tiêu đề hoặc nội dung");
      return;
    }
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
      toast.success("Đã tạo SEO metadata!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo SEO");
    } finally {
      setAiLoading(null);
    }
  };

  const handleAutoExcerpt = async () => {
    if (!form.content) {
      toast.error("Cần có nội dung");
      return;
    }
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.slug) {
        throw new Error("Tiêu đề và slug là bắt buộc");
      }

      const payload: any = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        cover_image_url: form.cover_image_url || null,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        content: form.content,
        status: form.status as any,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords
          ? form.seo_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
          : null,
        related_tool_ids: form.related_tool_ids.length > 0 ? form.related_tool_ids : null,
      };

      if (isNew) {
        if (!user) throw new Error("Cần đăng nhập");
        const insertPayload = { ...payload, author_id: user.id };
        if (!isAdmin && !["draft", "pending_review"].includes(insertPayload.status)) {
          insertPayload.status = "pending_review";
        }
        const { error } = await supabase.from("blog_posts").insert(insertPayload);
        if (error) throw error;
        clearAutosaveDraft("blog-new");
      } else {
        if (form.status === "published" && !post?.published_at) {
          payload.published_at = new Date().toISOString();
        }
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
        clearAutosaveDraft(`blog-${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post-edit", id] });
      logAuditAction(isNew ? "blog_create" : "blog_update", "blog_post", id || "new", {
        status: form.status,
      });
      toast.success(isNew ? "Đã tạo bài viết" : "Đã cập nhật");
      navigate("/admin/blog");
    },
    onError: (e: any) => {
      toast.error(e.message || "Lỗi lưu bài viết");
    },
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate();
    setTimeout(() => setSaving(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold truncate">
              {isNew ? "Tạo bài viết mới" : "Chỉnh sửa bài viết"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                {isAdmin && <SelectItem value="published">Published</SelectItem>}
                {isAdmin && <SelectItem value="archived">Archived</SelectItem>}
              </SelectContent>
            </Select>

            {!isNew && post && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener">
                  <Eye className="h-4 w-4 mr-1" /> Xem
                </a>
              </Button>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Tiêu đề bài viết..."
                className="text-2xl font-bold border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
              />
            </div>

            {/* Slug */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Slug:</span>
              <Input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="flex-1 h-8 text-sm font-mono"
              />
            </div>

            {/* Rich Text Editor */}
            <RichTextEditor
              content={form.content}
              onChange={(v) => updateField("content", v)}
              placeholder="Bắt đầu viết bài... (gõ / để chèn blocks)"
              autosaveKey={isNew ? "blog-new" : `blog-${id}`}
            />
          </div>

          {/* Right: Sidebar with Tabs */}
          <div className="space-y-4">
            {/* Publish Box */}
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <h3 className="font-semibold text-sm">Xuất bản</h3>
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <span className="font-medium text-foreground">{form.status}</span>
                </div>
                {form.content && (
                  <div className="flex justify-between mt-1">
                    <span>Số từ:</span>
                    <span className="font-medium text-foreground">
                      {form.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Image */}
            <CoverImageUpload
              value={form.cover_image_url}
              onChange={(v) => updateField("cover_image_url", v)}
            />

            {/* Excerpt */}
            <div className="border rounded-lg p-4 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Excerpt</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoExcerpt}
                  disabled={!!aiLoading}
                  className="h-7 text-xs"
                >
                  {aiLoading === "excerpt" ? (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  AI tạo
                </Button>
              </div>
              <Input
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="Mô tả ngắn gọn..."
              />
            </div>

            {/* Tags */}
            <div className="border rounded-lg p-4 space-y-2 bg-card">
              <Label className="font-semibold text-sm">Tags</Label>
              <Input
                value={form.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                placeholder="tag1, tag2, tag3..."
              />
              <p className="text-xs text-muted-foreground">Phân cách bằng dấu phẩy</p>
            </div>

            {/* Related Tools */}
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">🔗 Đính kèm Tools</h3>
                <Button variant="ghost" size="sm" onClick={handleSuggestTools} disabled={!!aiLoading} className="h-7 text-xs">
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
                  {form.related_tool_ids.map((toolId: string) => {
                    const tool = allTools.find((t: any) => t.id === toolId);
                    return (
                      <Badge key={toolId} variant="secondary" className="gap-1 pr-1">
                        {tool?.name || toolId.slice(0, 8)}
                        <button type="button" className="ml-1 hover:text-destructive" onClick={() => updateField("related_tool_ids", form.related_tool_ids.filter((x: string) => x !== toolId))}>×</button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEO */}
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">SEO</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoSEO}
                  disabled={!!aiLoading}
                  className="h-7 text-xs"
                >
                  {aiLoading === "seo" ? (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  AI tạo
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  SEO Title <span className="text-muted-foreground">({form.seo_title.length}/60)</span>
                </Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) => updateField("seo_title", e.target.value)}
                  placeholder="Tiêu đề SEO"
                  maxLength={70}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Meta Description <span className="text-muted-foreground">({form.seo_description.length}/160)</span>
                </Label>
                <Input
                  value={form.seo_description}
                  onChange={(e) => updateField("seo_description", e.target.value)}
                  placeholder="Mô tả meta"
                  maxLength={170}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Keywords</Label>
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => updateField("seo_keywords", e.target.value)}
                  placeholder="keyword1, keyword2"
                  className="h-8 text-sm"
                />
              </div>

              {/* SERP Preview */}
              {(form.seo_title || form.title) && (
                <div className="border rounded p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">SERP Preview</p>
                  <div className="space-y-0.5">
                    <p className="text-blue-600 text-sm font-medium truncate">
                      {(form.seo_title || form.title).slice(0, 60)}
                    </p>
                    <p className="text-green-700 text-xs">astute.tools/blog/{form.slug || "..."}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {(form.seo_description || form.excerpt || "Chưa có mô tả...").slice(0, 160)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Translation (only for existing posts) */}
            {!isNew && id && (
              <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4" /> Dịch thuật
                </h3>
                <EntityTranslationEditor
                  entityType="blog"
                  entityId={id}
                  translateFunctionName="translate-blog"
                  fields={[
                    { key: "title", label: "Tiêu đề", type: "input", originalValue: form.title },
                    { key: "excerpt", label: "Excerpt", type: "textarea", originalValue: form.excerpt },
                    { key: "content", label: "Nội dung", type: "richtext", originalValue: form.content },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
