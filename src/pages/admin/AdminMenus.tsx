import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, ChevronUp, ChevronDown, FolderPlus, Eye, Link as LinkIcon, Smile, Download, Upload, RotateCcw } from "lucide-react";
import { icons, type LucideIcon } from "lucide-react";

const toKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const ALL_ICON_NAMES = Object.keys(icons).map(toKebab);

const POPULAR_ICONS = [
  "home", "search", "compass", "trending-up", "rocket", "briefcase", "zap",
  "star", "heart", "bookmark", "tag", "gift", "shopping-cart", "globe",
  "file-text", "layout-grid", "users", "message-circle", "bell", "settings",
  "folder", "award", "bar-chart-2", "calendar", "code", "cpu", "database",
  "download", "edit", "external-link", "eye", "filter", "flag", "image",
  "info", "layers", "link", "list", "lock", "mail", "map", "monitor",
  "package", "pen-tool", "phone", "play", "plus", "shield", "sparkles",
  "target", "terminal", "tool", "upload", "video", "wand-2",
];

interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  open_new_tab: boolean;
  children?: MenuItem[];
}

function IconPreview({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  if (!name) return null;
  // Convert kebab-case to PascalCase for icons lookup
  const pascalName = name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
  const Icon = (icons as Record<string, LucideIcon>)[pascalName];
  if (!Icon) return <span className="text-[10px] text-muted-foreground">{name}</span>;
  return <Icon className={className} />;
}

function IconPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = search
    ? ALL_ICON_NAMES.filter((n) => n.includes(search.toLowerCase())).slice(0, 60)
    : POPULAR_ICONS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Chọn icon">
          {value ? <IconPreview name={value} /> : <Smile className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Tìm icon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm mb-2"
        />
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              title="Xóa icon"
              onClick={() => { onChange(""); setOpen(false); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {filtered.map((name) => (
            <Button
              key={name}
              variant={value === name ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              title={name}
              onClick={() => { onChange(name); setOpen(false); }}
            >
              <IconPreview name={name} className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Không tìm thấy icon</p>}
      </PopoverContent>
    </Popover>
  );
}

export default function AdminMenus() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState("header");
  const [showPreview, setShowPreview] = useState(false);

  const { data: menu, isSuccess } = useQuery({
    queryKey: ["admin-menu", location],
    queryFn: async () => {
      const { data } = await supabase.from("menus").select("*").eq("location", location).maybeSingle();
      return data;
    },
  });

  const defaultHeaderItems: MenuItem[] = [
    { label: "Khám phá", url: "/tools", open_new_tab: false, icon: "compass" },
    { label: "Trending", url: "/trending", open_new_tab: false, icon: "trending-up" },
    { label: "Tasks", url: "/tasks", open_new_tab: false, icon: "briefcase" },
    { label: "Launches", url: "/launches", open_new_tab: false, icon: "rocket" },
    { label: "Workflows", url: "/workflows", open_new_tab: false, icon: "zap" },
    { label: "Ưu đãi", url: "/deals", open_new_tab: false, icon: "tag" },
    { label: "Blog", url: "/blog", open_new_tab: false, icon: "file-text" },
  ];

  const defaultFooterItems: MenuItem[] = [
    { label: "Khám phá", url: "#", open_new_tab: false, children: [
      { label: "Tất cả công cụ", url: "/tools", open_new_tab: false },
      { label: "Danh mục", url: "/categories", open_new_tab: false },
      { label: "Trending", url: "/trending", open_new_tab: false },
      { label: "So sánh", url: "/compare", open_new_tab: false },
    ]},
    { label: "Cộng đồng", url: "#", open_new_tab: false, children: [
      { label: "Blog", url: "/blog", open_new_tab: false },
      { label: "Bộ sưu tập", url: "/collections", open_new_tab: false },
      { label: "Gửi công cụ", url: "/submit", open_new_tab: false },
    ]},
    { label: "Thông tin", url: "#", open_new_tab: false, children: [
      { label: "Giới thiệu", url: "/about", open_new_tab: false },
      { label: "Liên hệ", url: "/contact", open_new_tab: false },
      { label: "Chính sách", url: "/privacy", open_new_tab: false },
    ]},
  ];

  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (isSuccess) {
      const dbItems = (menu?.items as any) as MenuItem[] | undefined;
      if (dbItems && dbItems.length > 0) {
        setItems(dbItems);
      } else {
        setItems(location === "header" ? defaultHeaderItems : defaultFooterItems);
      }
    }
  }, [menu, isSuccess, location]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (menu) {
        const { error } = await supabase.from("menus").update({ items: items as any, updated_at: new Date().toISOString() }).eq("id", menu.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menus").insert({ name: location, location, items: items as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
      queryClient.invalidateQueries({ queryKey: ["menu-header-with-id"] });
      queryClient.invalidateQueries({ queryKey: ["menu-footer-with-id"] });
      toast.success("Đã lưu menu");
    },
    onError: () => toast.error("Lỗi lưu menu"),
  });

  const addItem = () => setItems([...items, { label: "", url: "/", open_new_tab: false }]);

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setItems(updated);
  };

  const addChild = (parentIdx: number) => {
    const updated = [...items];
    if (!updated[parentIdx].children) updated[parentIdx].children = [];
    updated[parentIdx].children!.push({ label: "", url: "/", open_new_tab: false });
    setItems(updated);
  };

  const updateChild = (parentIdx: number, childIdx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[parentIdx].children![childIdx] as any)[field] = value;
    setItems(updated);
  };

  const removeChild = (parentIdx: number, childIdx: number) => {
    const updated = [...items];
    updated[parentIdx].children = updated[parentIdx].children!.filter((_, i) => i !== childIdx);
    setItems(updated);
  };

  const moveChild = (parentIdx: number, childIdx: number, dir: -1 | 1) => {
    const children = items[parentIdx].children;
    if (!children) return;
    const newIdx = childIdx + dir;
    if (newIdx < 0 || newIdx >= children.length) return;
    const updated = [...items];
    const ch = [...updated[parentIdx].children!];
    [ch[childIdx], ch[newIdx]] = [ch[newIdx], ch[childIdx]];
    updated[parentIdx].children = ch;
    setItems(updated);
  };

  const isFooter = location === "footer";

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Menu Manager</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="mr-1 h-3.5 w-3.5" /> {showPreview ? "Ẩn preview" : "Xem preview"}
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-1 h-3.5 w-3.5" /> Lưu menu
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="header">Header</SelectItem>
              <SelectItem value="footer">Footer</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{items.length} items · {items.reduce((acc, it) => acc + (it.children?.length || 0), 0)} children</Badge>
          <Button size="sm" variant="ghost" onClick={() => {
            const other = location === "header" ? "footer" : "header";
            if (confirm(`Copy menu ${location} → ${other}?`)) {
              (async () => {
                const { data: existing } = await supabase.from("menus").select("*").eq("location", other).maybeSingle();
                if (existing) {
                  await supabase.from("menus").update({ items: items as any, updated_at: new Date().toISOString() }).eq("id", existing.id);
                } else {
                  await supabase.from("menus").insert({ name: other, location: other, items: items as any });
                }
                queryClient.invalidateQueries({ queryKey: ["admin-menu"] });
                toast.success(`Đã copy menu sang ${other}`);
              })();
            }
          }}>
            <LinkIcon className="mr-1 h-3.5 w-3.5" /> Duplicate → {location === "header" ? "Footer" : "Header"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            if (confirm("Reset menu về mặc định?")) {
              setItems(location === "header" ? defaultHeaderItems : defaultFooterItems);
              toast.info("Đã reset về mặc định. Nhấn Lưu để áp dụng.");
            }
          }}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `menu-${location}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
            URL.revokeObjectURL(url);
            toast.success("Đã export menu JSON");
          }}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
          <div className="relative">
            <Button size="sm" variant="ghost">
              <Upload className="mr-1 h-3.5 w-3.5" /> Import
            </Button>
            <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) throw new Error("Invalid");
                setItems(parsed);
                toast.success("Đã import menu. Nhấn Lưu để áp dụng.");
              } catch {
                toast.error("File JSON không hợp lệ");
              }
              e.target.value = "";
            }} />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Preview — {location === "header" ? "Header Navigation" : "Footer Columns"}</CardTitle></CardHeader>
            <CardContent>
              {location === "header" ? (
                <nav className="flex items-center gap-6 flex-wrap">
                  {items.map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-default">
                      {item.icon && <IconPreview name={item.icon} className="h-3.5 w-3.5" />}
                      {item.label || <span className="italic text-muted-foreground/50">Chưa đặt tên</span>}
                    </span>
                  ))}
                  {items.length === 0 && <span className="text-sm text-muted-foreground italic">Chưa có menu item</span>}
                </nav>
              ) : (
                <div className="grid gap-6 grid-cols-2 sm:grid-cols-3">
                  {items.map((col, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-semibold mb-2">{col.label || <span className="italic text-muted-foreground/50">Tiêu đề cột</span>}</h4>
                      <div className="flex flex-col gap-1.5">
                        {(col.children ?? []).map((child, ci) => (
                          <span key={ci} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            {child.icon && <IconPreview name={child.icon} className="h-3 w-3" />}
                            {child.label || "..."}
                          </span>
                        ))}
                        {(!col.children || col.children.length === 0) && <span className="text-xs text-muted-foreground/50 italic">Chưa có link</span>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <span className="text-sm text-muted-foreground italic col-span-3">Chưa có cột footer</span>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Menu Items Editor */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                {isFooter ? "Footer Columns" : "Header Items"} ({items.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {isFooter ? "Thêm cột" : "Thêm item"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Chưa có menu item. Bấm "Thêm {isFooter ? "cột" : "item"}" để bắt đầu.
              </p>
            )}

            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                {/* Parent item row */}
                <div className="flex items-start gap-2 p-3 bg-muted/30">
                  <div className="flex flex-col gap-0.5 shrink-0 mt-1.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
                  <IconPicker value={item.icon} onChange={(v) => updateItem(idx, "icon", v)} />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder={isFooter ? "Tiêu đề cột" : "Label"}
                      value={item.label}
                      onChange={(e) => updateItem(idx, "label", e.target.value)}
                    />
                    <div className="space-y-1">
                      <Input
                        placeholder="URL"
                        value={item.url}
                        onChange={(e) => updateItem(idx, "url", e.target.value)}
                        className={`${isFooter ? "opacity-50" : ""} ${!isFooter && item.url && !item.url.startsWith("/") && !item.url.startsWith("http") && item.url !== "#" ? "border-destructive" : ""}`}
                        disabled={isFooter}
                      />
                      {!isFooter && item.url && !item.url.startsWith("/") && !item.url.startsWith("http") && item.url !== "#" && (
                        <p className="text-[10px] text-destructive">URL nên bắt đầu bằng / hoặc http</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isFooter && (
                        <>
                          <Switch checked={item.open_new_tab} onCheckedChange={(v) => updateItem(idx, "open_new_tab", v)} />
                          <Label className="text-xs">New tab</Label>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isFooter && (
                      <Button variant="ghost" size="icon" onClick={() => addChild(idx)} title="Thêm link con">
                        <FolderPlus className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Children (footer only) */}
                {isFooter && item.children && item.children.length > 0 && (
                  <div className="border-t">
                    {item.children.map((child, ci) => (
                      <div key={ci} className="flex items-center gap-2 px-3 py-2 pl-14 border-b last:border-b-0 bg-background">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveChild(idx, ci, -1)} disabled={ci === 0}>
                            <ChevronUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveChild(idx, ci, 1)} disabled={ci === item.children!.length - 1}>
                            <ChevronDown className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <IconPicker value={child.icon} onChange={(v) => updateChild(idx, ci, "icon", v)} />
                        <Input
                          placeholder="Label"
                          value={child.label}
                          onChange={(e) => updateChild(idx, ci, "label", e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder="URL"
                          value={child.url}
                          onChange={(e) => updateChild(idx, ci, "url", e.target.value)}
                          className="h-8 text-sm"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={child.open_new_tab}
                            onCheckedChange={(v) => updateChild(idx, ci, "open_new_tab", v)}
                            className="scale-75"
                          />
                          <Label className="text-[10px] text-muted-foreground">Tab</Label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeChild(idx, ci)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
