import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Languages, RefreshCw, Check, Pencil, Save, X, Menu } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  children?: MenuItem[];
}

export function MenuTranslationsTab() {
  const queryClient = useQueryClient();
  const [targetLocale, setTargetLocale] = useState<Locale>("en");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: menus = [] } = useQuery({
    queryKey: ["admin-menus-translation"],
    queryFn: async () => {
      const { data } = await supabase.from("menus").select("id, name, location, items");
      return data ?? [];
    },
  });

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["admin-menu-translations", targetLocale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .eq("entity_type", "menu")
        .eq("locale", targetLocale)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const translateMenuMutation = useMutation({
    mutationFn: async (menuId: string) => {
      const { data, error } = await supabase.functions.invoke("translate-menu", {
        body: { menu_id: menuId, locale: targetLocale },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-translations"] });
      toast.success(`Đã dịch ${data.saved} nhãn menu sang ${SUPPORTED_LOCALES[targetLocale].nativeName}`);
    },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch menu"),
  });

  const translateAllMutation = useMutation({
    mutationFn: async () => {
      let total = 0;
      for (const menu of menus) {
        try {
          const { data, error } = await supabase.functions.invoke("translate-menu", {
            body: { menu_id: menu.id, locale: targetLocale },
          });
          if (!error && !data?.error) total += data.saved || 0;
        } catch {}
        await new Promise(r => setTimeout(r, 1500));
      }
      return total;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-translations"] });
      toast.success(`Đã dịch ${count} nhãn menu`);
    },
    onError: () => toast.error("Lỗi dịch menu"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase.from("translations").update({
        translated_text: text,
        is_auto: false,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-menu-translations"] });
      toast.success("Đã cập nhật");
      setEditingId(null);
    },
  });

  const isTranslating = translateMenuMutation.isPending || translateAllMutation.isPending;

  // Build a flat list of menu labels with their translations
  const menuLabels: { menuName: string; menuId: string; fieldName: string; originalLabel: string; translation?: any }[] = [];

  menus.forEach((menu: any) => {
    const items = (menu.items || []) as MenuItem[];
    items.forEach((item, i) => {
      const fieldName = `item_${i}_label`;
      const trans = translations.find((t: any) => t.entity_id === menu.id && t.field_name === fieldName);
      menuLabels.push({ menuName: menu.name, menuId: menu.id, fieldName, originalLabel: item.label, translation: trans });
      if (item.children) {
        item.children.forEach((child, j) => {
          const childField = `item_${i}_child_${j}_label`;
          const childTrans = translations.find((t: any) => t.entity_id === menu.id && t.field_name === childField);
          menuLabels.push({ menuName: menu.name, menuId: menu.id, fieldName: childField, originalLabel: child.label, translation: childTrans });
        });
      }
    });
  });

  const translatedCount = menuLabels.filter(l => l.translation).length;
  const totalCount = menuLabels.length;
  const percent = totalCount > 0 ? Math.round((translatedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {translatedCount}/{totalCount} nhãn đã dịch ({percent}%)
          </p>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={targetLocale} onValueChange={(v) => setTargetLocale(v as Locale)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => translateAllMutation.mutate()} disabled={isTranslating} size="sm">
            {isTranslating ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Languages className="mr-1 h-4 w-4" />}
            Dịch tất cả menu
          </Button>
        </div>
      </div>

      {/* Per-menu cards */}
      {menus.map((menu: any) => {
        const labels = menuLabels.filter(l => l.menuId === menu.id);
        const menuTranslated = labels.filter(l => l.translation).length;
        return (
          <Card key={menu.id}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Menu className="h-4 w-4" />
                {menu.name}
                <Badge variant="outline" className="text-xs">{menu.location}</Badge>
                <Badge variant={menuTranslated === labels.length ? "default" : "secondary"} className="text-xs">
                  {menuTranslated}/{labels.length}
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => translateMenuMutation.mutate(menu.id)}
                disabled={isTranslating}
                className="text-xs"
              >
                {translateMenuMutation.isPending ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                Dịch menu này
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Gốc (Tiếng Việt)</TableHead>
                    <TableHead>Bản dịch ({SUPPORTED_LOCALES[targetLocale]?.nativeName})</TableHead>
                    <TableHead className="w-[100px]">Trạng thái</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-4">
                        Menu chưa có item nào
                      </TableCell>
                    </TableRow>
                  ) : labels.map((label) => (
                    <TableRow key={`${label.menuId}-${label.fieldName}`}>
                      <TableCell className="text-sm font-medium">{label.originalLabel}</TableCell>
                      <TableCell>
                        {editingId === label.translation?.id ? (
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{label.translation?.translated_text || <span className="text-muted-foreground italic">Chưa dịch</span>}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {label.translation ? (
                          <Badge variant={label.translation.is_auto ? "secondary" : "default"} className="text-xs">
                            {label.translation.is_auto ? "AI" : "Thủ công"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600">Thiếu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {label.translation && (
                          editingId === label.translation.id ? (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: label.translation.id, text: editText })}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(label.translation.id); setEditText(label.translation.translated_text); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
