import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit2, Check, X, Languages, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import vi from "@/lib/translations/vi";
import en from "@/lib/translations/en";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const SYSTEM_ENTITY_ID = "00000000-0000-0000-0000-000000000001";

const KEY_PREFIXES = [
  { value: "all", label: "Tất cả" },
  { value: "nav.", label: "Navigation" },
  { value: "header.", label: "Header" },
  { value: "hero.", label: "Hero" },
  { value: "categories.", label: "Categories" },
  { value: "featured.", label: "Featured" },
  { value: "stats.", label: "Stats" },
  { value: "reviews.", label: "Reviews" },
  { value: "blog.", label: "Blog" },
  { value: "deals.", label: "Deals" },
  { value: "newsletter.", label: "Newsletter" },
  { value: "footer.", label: "Footer" },
  { value: "auth.", label: "Auth" },
  { value: "tools.", label: "Tools" },
  { value: "tool.", label: "Tool Detail" },
  { value: "pricing.", label: "Pricing" },
  { value: "compare.", label: "Compare" },
  { value: "collections.", label: "Collections" },
  { value: "workflows.", label: "Workflows" },
  { value: "trending.", label: "Trending" },
  { value: "launches.", label: "Launches" },
  { value: "category.", label: "Category" },
  { value: "common.", label: "Common" },
];

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

export function SystemTranslationsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [targetLocale, setTargetLocale] = useState<Locale>("en");

  const allKeys = useMemo(() => {
    const keys = new Set([...Object.keys(vi), ...Object.keys(en)]);
    return Array.from(keys).sort();
  }, []);

  // Load DB overrides for selected locale
  const { data: dbTranslations = [], isLoading: dbLoading } = useQuery({
    queryKey: ["system-translations-db", targetLocale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("field_name, translated_text, is_auto")
        .eq("entity_type", "system")
        .eq("entity_id", SYSTEM_ENTITY_ID)
        .eq("locale", targetLocale);
      if (error) throw error;
      return data ?? [];
    },
  });

  const dbMap = useMemo(() => {
    const map: Record<string, { text: string; isAuto: boolean }> = {};
    dbTranslations.forEach((t: any) => {
      map[t.field_name] = { text: t.translated_text, isAuto: t.is_auto };
    });
    return map;
  }, [dbTranslations]);

  const getTranslatedText = (key: string): string => {
    if (dbMap[key]) return dbMap[key].text;
    if (targetLocale === "en") return en[key] || "";
    return "";
  };

  const filtered = useMemo(() => {
    return allKeys.filter((key) => {
      if (prefixFilter !== "all" && !key.startsWith(prefixFilter)) return false;
      if (search) {
        const s = search.toLowerCase();
        return key.toLowerCase().includes(s) ||
          (vi[key] || "").toLowerCase().includes(s) ||
          getTranslatedText(key).toLowerCase().includes(s);
      }
      return true;
    });
  }, [allKeys, search, prefixFilter, dbMap, targetLocale]);

  const totalKeys = allKeys.length;
  const translatedCount = allKeys.filter(k => getTranslatedText(k)).length;
  const missingCount = totalKeys - translatedCount;
  const dbCount = Object.keys(dbMap).length;

  // Save single key to DB
  const saveMutation = useMutation({
    mutationFn: async ({ key, text }: { key: string; text: string }) => {
      // Upsert: delete then insert
      await supabase.from("translations")
        .delete()
        .eq("entity_type", "system")
        .eq("entity_id", SYSTEM_ENTITY_ID)
        .eq("locale", targetLocale)
        .eq("field_name", key);

      if (text.trim()) {
        const { error } = await supabase.from("translations").insert({
          entity_type: "system",
          entity_id: SYSTEM_ENTITY_ID,
          field_name: key,
          locale: targetLocale,
          translated_text: text.trim(),
          is_auto: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-translations-db"] });
      queryClient.invalidateQueries({ queryKey: ["system-translations-override"] });
      toast.success("Đã lưu bản dịch");
      setEditingKey(null);
    },
    onError: () => toast.error("Lỗi lưu bản dịch"),
  });

  // Bulk AI translate
  const bulkMutation = useMutation({
    mutationFn: async () => {
      const missingKeys = allKeys
        .filter(k => !getTranslatedText(k) && vi[k])
        .map(k => ({ key: k, text: vi[k] }));
      if (missingKeys.length === 0) throw new Error("Không có key nào cần dịch");

      const { data, error } = await supabase.functions.invoke("translate-system-keys", {
        body: { keys: missingKeys.slice(0, 100), locale: targetLocale },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["system-translations-db"] });
      queryClient.invalidateQueries({ queryKey: ["system-translations-override"] });
      toast.success(`Đã dịch ${data.saved} keys sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`);
    },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch"),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1">📝 {totalKeys} keys</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">✅ {translatedCount} đã dịch</Badge>
          {dbCount > 0 && <Badge variant="outline" className="text-sm px-3 py-1">💾 {dbCount} từ DB</Badge>}
          {missingCount > 0 && <Badge variant="destructive" className="text-sm px-3 py-1">⚠️ {missingCount} thiếu</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={targetLocale} onValueChange={(v) => setTargetLocale(v as Locale)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>
                  {meta.flag} {meta.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending || missingCount === 0}
            size="sm"
          >
            {bulkMutation.isPending ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Languages className="mr-1 h-4 w-4" />}
            Dịch AI ({Math.min(missingCount, 100)})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm key hoặc nội dung..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {KEY_PREFIXES.map((p) => (
            <Button key={p.value} variant={prefixFilter === p.value ? "default" : "outline"} size="sm" onClick={() => setPrefixFilter(p.value)} className="text-xs">
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Key</TableHead>
              <TableHead>🇻🇳 Tiếng Việt</TableHead>
              <TableHead>{SUPPORTED_LOCALES[targetLocale]?.flag} {SUPPORTED_LOCALES[targetLocale]?.nativeName}</TableHead>
              <TableHead className="w-[80px]">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((key) => {
              const viText = vi[key] || "";
              const translatedText = getTranslatedText(key);
              const isEditing = editingKey === key;
              const dbEntry = dbMap[key];

              return (
                <TableRow key={key} className={!translatedText ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{key}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate" title={viText}>{viText}</TableCell>
                  <TableCell className="text-sm max-w-[300px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm h-8" autoFocus />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => saveMutation.mutate({ key, text: editValue })} disabled={saveMutation.isPending}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingKey(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="truncate" title={translatedText}>
                          {translatedText || <span className="text-muted-foreground italic text-xs">— chưa dịch —</span>}
                        </span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => { setEditingKey(key); setEditValue(translatedText); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {translatedText ? (
                      dbEntry ? (
                        <Badge variant={dbEntry.isAuto ? "secondary" : "default"} className="text-[10px]">
                          {dbEntry.isAuto ? "AI" : "✋"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">File</Badge>
                      )
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Thiếu</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length > 100 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t">
            Hiển thị 100/{filtered.length} keys. Dùng bộ lọc để thu hẹp kết quả.
          </div>
        )}
      </div>
    </div>
  );
}
