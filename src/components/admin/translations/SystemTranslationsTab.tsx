import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit2, Check, X } from "lucide-react";
import vi from "@/lib/translations/vi";
import en from "@/lib/translations/en";

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

export function SystemTranslationsTab() {
  const [search, setSearch] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const allKeys = useMemo(() => {
    const keys = new Set([...Object.keys(vi), ...Object.keys(en)]);
    return Array.from(keys).sort();
  }, []);

  const filtered = useMemo(() => {
    return allKeys.filter((key) => {
      if (prefixFilter !== "all" && !key.startsWith(prefixFilter)) return false;
      if (search) {
        const s = search.toLowerCase();
        return key.toLowerCase().includes(s) ||
          (vi[key] || "").toLowerCase().includes(s) ||
          (en[key] || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [allKeys, search, prefixFilter]);

  const totalKeys = allKeys.length;
  const translatedCount = allKeys.filter(k => en[k]).length;
  const missingCount = totalKeys - translatedCount;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          📝 {totalKeys} keys
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          ✅ {translatedCount} đã dịch EN
        </Badge>
        {missingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            ⚠️ {missingCount} thiếu EN
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm key hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {KEY_PREFIXES.map((p) => (
            <Button
              key={p.value}
              variant={prefixFilter === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPrefixFilter(p.value)}
              className="text-xs"
            >
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
              <TableHead>🇺🇸 English</TableHead>
              <TableHead className="w-[60px]">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((key) => {
              const viText = vi[key] || "";
              const enText = en[key] || "";
              const isEditing = editingKey === key;

              return (
                <TableRow key={key} className={!enText ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {key}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate" title={viText}>
                    {viText}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm h-8"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            // For now, just close - static files can't be edited at runtime
                            setEditingKey(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setEditingKey(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="truncate" title={enText}>
                          {enText || <span className="text-muted-foreground italic text-xs">— chưa dịch —</span>}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => {
                            setEditingKey(key);
                            setEditValue(enText);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {enText ? (
                      <Badge variant="secondary" className="text-[10px]">✓</Badge>
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
