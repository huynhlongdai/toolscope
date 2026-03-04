import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";

interface MenuItem {
  label: string;
  url: string;
  open_new_tab: boolean;
  children?: MenuItem[];
}

export default function AdminMenus() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState("header");

  const { data: menu } = useQuery({
    queryKey: ["admin-menu", location],
    queryFn: async () => {
      const { data } = await supabase.from("menus").select("*").eq("location", location).maybeSingle();
      return data;
    },
  });

  const [items, setItems] = useState<MenuItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (menu && !initialized) {
    setItems((menu.items as any) ?? []);
    setInitialized(true);
  }

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
      toast.success("Đã lưu menu");
    },
  });

  const addItem = () => setItems([...items, { label: "", url: "/", open_new_tab: false }]);

  const updateItem = (idx: number, field: keyof MenuItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    setInitialized(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Menu Manager</h1>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" /> Lưu menu
          </Button>
        </div>

        <Select value={location} onValueChange={handleLocationChange}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="header">Header</SelectItem>
            <SelectItem value="footer">Footer</SelectItem>
          </SelectContent>
        </Select>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Menu Items ({location})</CardTitle>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3.5 w-3.5" /> Thêm item</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa có menu item</p>}
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 border rounded-md p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input placeholder="Label" value={item.label} onChange={(e) => updateItem(idx, "label", e.target.value)} />
                  <Input placeholder="URL" value={item.url} onChange={(e) => updateItem(idx, "url", e.target.value)} />
                  <div className="flex items-center gap-2">
                    <Switch checked={item.open_new_tab} onCheckedChange={(v) => updateItem(idx, "open_new_tab", v)} />
                    <Label className="text-xs">New tab</Label>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
