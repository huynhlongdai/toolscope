import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TranslationStats } from "@/components/admin/translations/TranslationStats";
import { UntranslatedSection } from "@/components/admin/translations/UntranslatedSection";
import { TranslationTable } from "@/components/admin/translations/TranslationTable";
import { TranslationEditDialog } from "@/components/admin/translations/TranslationEditDialog";
import { TranslationDiffDialog } from "@/components/admin/translations/TranslationDiffDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Languages, RefreshCw } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

export function ContentTranslationsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [targetLocale, setTargetLocale] = useState<Locale>("en");
  const [editItem, setEditItem] = useState<any>(null);
  const [diffItem, setDiffItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBlogIds, setSelectedBlogIds] = useState<Set<string>>(new Set());
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());

  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools-for-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name, slug, description, short_description").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const { data: blogs = [] } = useQuery({
    queryKey: ["admin-blogs-for-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("id, title, slug, excerpt").eq("status", "published").order("title");
      return data ?? [];
    },
  });

  const { data: menus = [] } = useQuery({
    queryKey: ["admin-menus-for-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("menus").select("id, name, location, items");
      return data ?? [];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["admin-workflows-for-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("workflows").select("id, title, slug, description").eq("status", "published").order("title");
      return data ?? [];
    },
  });

  const entityTypes = entityFilter === "all" ? ["tool", "blog", "menu", "workflow"] : [entityFilter];

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["admin-translations", entityFilter, targetLocale],
    queryFn: async () => {
      let q = supabase.from("translations").select("*").eq("locale", targetLocale).order("updated_at", { ascending: false });
      q = q.in("entity_type", entityTypes);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data;
    },
  });

  const translatedToolIds = new Set(translations.filter((t: any) => t.entity_type === "tool").map((t: any) => t.entity_id));
  const translatedBlogIds = new Set(translations.filter((t: any) => t.entity_type === "blog").map((t: any) => t.entity_id));
  const translatedMenuIds = new Set(translations.filter((t: any) => t.entity_type === "menu").map((t: any) => t.entity_id));
  const translatedWorkflowIds = new Set(translations.filter((t: any) => t.entity_type === "workflow").map((t: any) => t.entity_id));
  const untranslatedTools = tools.filter((t: any) => !translatedToolIds.has(t.id));
  const untranslatedBlogs = blogs.filter((b: any) => !translatedBlogIds.has(b.id));
  const untranslatedMenus = menus.filter((m: any) => !translatedMenuIds.has(m.id));
  const untranslatedWorkflows = workflows.filter((w: any) => !translatedWorkflowIds.has(w.id));

  const toolPercent = tools.length > 0 ? Math.round((translatedToolIds.size / tools.length) * 100) : 0;
  const blogPercent = blogs.length > 0 ? Math.round((translatedBlogIds.size / blogs.length) * 100) : 0;
  const workflowPercent = workflows.length > 0 ? Math.round((translatedWorkflowIds.size / workflows.length) * 100) : 0;
  const autoCount = translations.filter((t: any) => t.is_auto).length;
  const manualCount = translations.filter((t: any) => !t.is_auto).length;

  const translateToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-tool", { body: { tool_id: toolId, locale: targetLocale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); toast.success(`Đã dịch ${data.saved} trường sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch tool"),
  });

  const translateBlogMutation = useMutation({
    mutationFn: async (blogId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-blog", { body: { blog_id: blogId, locale: targetLocale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); toast.success(`Đã dịch blog sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch blog"),
  });

  const translateMenuMutation = useMutation({
    mutationFn: async (menuId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-menu", { body: { menu_id: menuId, locale: targetLocale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); toast.success(`Đã dịch menu sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch menu"),
  });

  const translateWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-blog", { body: { workflow_id: workflowId, locale: targetLocale } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); toast.success(`Đã dịch workflow sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch workflow"),
  });

  const bulkTranslateMutation = useMutation({
    mutationFn: async (toolIds: string[]) => {
      let successCount = 0;
      for (const id of toolIds) {
        try { const { data, error } = await supabase.functions.invoke("translate-tool", { body: { tool_id: id, locale: targetLocale } }); if (!error && !data?.error) successCount++; } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 1500));
      }
      return successCount;
    },
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); setSelectedIds(new Set()); toast.success(`Đã dịch ${count} tools sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: () => toast.error("Lỗi dịch hàng loạt"),
  });

  const bulkTranslateBlogsMutation = useMutation({
    mutationFn: async (blogIds: string[]) => {
      let successCount = 0;
      for (const id of blogIds) {
        try { const { data, error } = await supabase.functions.invoke("translate-blog", { body: { blog_id: id, locale: targetLocale } }); if (!error && !data?.error) successCount++; } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      return successCount;
    },
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); setSelectedBlogIds(new Set()); toast.success(`Đã dịch ${count} blogs sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: () => toast.error("Lỗi dịch blog hàng loạt"),
  });

  const bulkTranslateWorkflowsMutation = useMutation({
    mutationFn: async (wfIds: string[]) => {
      let successCount = 0;
      for (const id of wfIds) {
        try { const { data, error } = await supabase.functions.invoke("translate-blog", { body: { workflow_id: id, locale: targetLocale } }); if (!error && !data?.error) successCount++; } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      return successCount;
    },
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); setSelectedWorkflowIds(new Set()); toast.success(`Đã dịch ${count} workflows sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`); },
    onError: () => toast.error("Lỗi dịch workflow hàng loạt"),
  });

  const updateTranslation = useMutation({
    mutationFn: async ({ id, translated_text }: { id: string; translated_text: string }) => {
      const { error } = await supabase.from("translations").update({ translated_text, is_auto: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-translations"] }); toast.success("Đã cập nhật bản dịch"); setEditItem(null); },
  });

  const filtered = translations.filter((t: any) => {
    if (entityFilter !== "all" && t.entity_type !== entityFilter) return false;
    const entityName = getEntityName(t);
    return entityName.toLowerCase().includes(search.toLowerCase()) ||
      t.field_name.toLowerCase().includes(search.toLowerCase()) ||
      t.translated_text.toLowerCase().includes(search.toLowerCase());
  });

  function getOriginalText(item: any) {
    if (item.entity_type === "tool") {
      const tool = tools.find((t: any) => t.id === item.entity_id);
      return tool ? (tool as any)[item.field_name] || "" : "";
    }
    if (item.entity_type === "blog") {
      const blog = blogs.find((b: any) => b.id === item.entity_id);
      return blog ? (blog as any)[item.field_name] || "" : "";
    }
    if (item.entity_type === "workflow") {
      const wf = workflows.find((w: any) => w.id === item.entity_id);
      return wf ? (wf as any)[item.field_name] || "" : "";
    }
    if (item.entity_type === "menu") return item.field_name;
    return "";
  }

  function getEntityName(t: any) {
    if (t.entity_type === "tool") return tools.find((tool: any) => tool.id === t.entity_id)?.name || t.entity_id.slice(0, 8);
    if (t.entity_type === "blog") return blogs.find((b: any) => b.id === t.entity_id)?.title || t.entity_id.slice(0, 8);
    if (t.entity_type === "workflow") return workflows.find((w: any) => w.id === t.entity_id)?.title || t.entity_id.slice(0, 8);
    if (t.entity_type === "menu") return menus.find((m: any) => m.id === t.entity_id)?.name || t.entity_id.slice(0, 8);
    return t.entity_id.slice(0, 8);
  }

  const handleBulkTranslate = () => {
    if (selectedIds.size === 0) {
      const ids = untranslatedTools.slice(0, 10).map((t: any) => t.id);
      if (ids.length === 0) return toast.info("Tất cả tools đã được dịch");
      bulkTranslateMutation.mutate(ids);
    } else {
      bulkTranslateMutation.mutate(Array.from(selectedIds));
    }
  };

  const isAnyTranslating = translateToolMutation.isPending || translateBlogMutation.isPending || translateMenuMutation.isPending || translateWorkflowMutation.isPending || bulkTranslateMutation.isPending || bulkTranslateBlogsMutation.isPending || bulkTranslateWorkflowsMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          {translations.length} bản dịch · {autoCount} AI · {manualCount} thủ công
        </p>
        <div className="flex items-center gap-2">
          <Select value={targetLocale} onValueChange={(v) => setTargetLocale(v as Locale)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBulkTranslate} disabled={isAnyTranslating} size="sm">
            {bulkTranslateMutation.isPending ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Languages className="mr-1 h-4 w-4" />}
            {selectedIds.size > 0 ? `Dịch ${selectedIds.size} đã chọn` : `Dịch tools (${Math.min(untranslatedTools.length, 10)})`}
          </Button>
        </div>
      </div>

      <TranslationStats
        toolPercent={toolPercent}
        blogPercent={blogPercent}
        translatedToolCount={translatedToolIds.size}
        totalTools={tools.length}
        translatedBlogCount={translatedBlogIds.size}
        totalBlogs={blogs.length}
        autoCount={autoCount}
        manualCount={manualCount}
        workflowPercent={workflowPercent}
        translatedWorkflowCount={translatedWorkflowIds.size}
        totalWorkflows={workflows.length}
      />

      <UntranslatedSection
        untranslatedTools={untranslatedTools}
        untranslatedBlogs={untranslatedBlogs}
        untranslatedMenus={untranslatedMenus}
        untranslatedWorkflows={untranslatedWorkflows}
        onTranslateTool={(id) => translateToolMutation.mutate(id)}
        onTranslateBlog={(id) => translateBlogMutation.mutate(id)}
        onTranslateMenu={(id) => translateMenuMutation.mutate(id)}
        onTranslateWorkflow={(id) => translateWorkflowMutation.mutate(id)}
        onBulkTranslateBlogs={(ids) => bulkTranslateBlogsMutation.mutate(ids)}
        onBulkTranslateWorkflows={(ids) => bulkTranslateWorkflowsMutation.mutate(ids)}
        isTranslating={isAnyTranslating}
        selectedToolIds={selectedIds}
        onToggleSelectTool={(id) => { setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }}
        selectedBlogIds={selectedBlogIds}
        onToggleSelectBlog={(id) => { setSelectedBlogIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }}
        selectedWorkflowIds={selectedWorkflowIds}
        onToggleSelectWorkflow={(id) => { setSelectedWorkflowIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }}
        targetLocale={targetLocale}
      />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="tool">Tools</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="workflow">Workflow</SelectItem>
            <SelectItem value="menu">Menu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TranslationTable
        translations={filtered}
        isLoading={isLoading}
        getEntityName={getEntityName}
        onEdit={setEditItem}
        onDiff={(item) => setDiffItem({ ...item, originalText: getOriginalText(item) })}
      />

      <TranslationEditDialog item={editItem} onClose={() => setEditItem(null)} onSave={(id, text) => updateTranslation.mutate({ id, translated_text: text })} onChange={(item) => setEditItem(item)} />
      <TranslationDiffDialog item={diffItem} onClose={() => setDiffItem(null)} />
    </div>
  );
}
