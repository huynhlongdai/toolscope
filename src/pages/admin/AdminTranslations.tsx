import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Languages, RefreshCw, Pencil, CheckCircle } from "lucide-react";

export default function AdminTranslations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [editItem, setEditItem] = useState<any>(null);

  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools-for-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id, name, slug").eq("status", "published").order("name");
      return data ?? [];
    },
  });

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["admin-translations", entityFilter],
    queryFn: async () => {
      let q = supabase.from("translations").select("*").order("updated_at", { ascending: false });
      if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Group translations by entity
  const translatedToolIds = new Set(translations.filter((t: any) => t.entity_type === "tool").map((t: any) => t.entity_id));
  const untranslatedTools = tools.filter((t: any) => !translatedToolIds.has(t.id));

  const translateMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-tool", {
        body: { tool_id: toolId, locale: "en" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
      toast.success(`Đã dịch ${data.saved} trường`);
    },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch"),
  });

  const updateTranslation = useMutation({
    mutationFn: async ({ id, translated_text }: { id: string; translated_text: string }) => {
      const { error } = await supabase.from("translations").update({
        translated_text,
        is_auto: false,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
      toast.success("Đã cập nhật bản dịch");
      setEditItem(null);
    },
  });

  const filtered = translations.filter((t: any) => {
    const toolName = tools.find((tool: any) => tool.id === t.entity_id)?.name || "";
    return toolName.toLowerCase().includes(search.toLowerCase()) ||
      t.field_name.toLowerCase().includes(search.toLowerCase()) ||
      t.translated_text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Languages className="h-6 w-6 md:h-7 md:w-7" /> Quản lý bản dịch
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {translatedToolIds.size} tools đã dịch · {untranslatedTools.length} chưa dịch
          </p>
        </div>

        {/* Untranslated tools section */}
        {untranslatedTools.length > 0 && (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-4">
            <h3 className="text-sm font-medium mb-2">⚠️ Tools chưa dịch ({untranslatedTools.length})</h3>
            <div className="flex flex-wrap gap-2">
              {untranslatedTools.slice(0, 20).map((t: any) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  onClick={() => translateMutation.mutate(t.id)}
                  disabled={translateMutation.isPending}
                  className="text-xs"
                >
                  {translateMutation.isPending ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                  {t.name}
                </Button>
              ))}
              {untranslatedTools.length > 20 && (
                <span className="text-xs text-muted-foreground self-center">+{untranslatedTools.length - 20} khác</span>
              )}
            </div>
          </div>
        )}

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
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Bản dịch (preview)</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có bản dịch</TableCell></TableRow>
              ) : (
                filtered.map((t: any) => {
                  const toolName = tools.find((tool: any) => tool.id === t.entity_id)?.name || t.entity_id.slice(0, 8);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{toolName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{t.field_name}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">{t.translated_text.slice(0, 100)}</TableCell>
                      <TableCell>
                        <Badge variant={t.is_auto ? "secondary" : "default"} className="text-xs">
                          {t.is_auto ? "AI" : "Thủ công"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditItem(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa bản dịch</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <Label>Field: {editItem.field_name}</Label>
                <p className="text-xs text-muted-foreground">Locale: {editItem.locale}</p>
              </div>
              <div className="space-y-2">
                <Label>Nội dung dịch</Label>
                <Textarea
                  value={editItem.translated_text}
                  onChange={(e) => setEditItem({ ...editItem, translated_text: e.target.value })}
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)}>Hủy</Button>
                <Button onClick={() => updateTranslation.mutate({ id: editItem.id, translated_text: editItem.translated_text })}>
                  <CheckCircle className="mr-1 h-4 w-4" /> Lưu
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
