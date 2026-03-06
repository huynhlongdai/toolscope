import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Globe, Code, FolderCog } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [gaId, setGaId] = useState("");
  const [headScripts, setHeadScripts] = useState("");
  const [bodyScripts, setBodyScripts] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, icon").is("parent_id", null).order("sort_order");
      return data ?? [];
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
  });

  useEffect(() => {
    if (settings) {
      setGaId(settings.ga_measurement_id || "");
      setHeadScripts(settings.custom_head_scripts || "");
      setBodyScripts(settings.custom_body_scripts || "");
      setDefaultCategoryId(settings.default_category_id || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "ga_measurement_id", value: gaId },
        { key: "custom_head_scripts", value: headScripts },
        { key: "custom_body_scripts", value: bodyScripts },
        { key: "default_category_id", value: defaultCategoryId },
      ];
      for (const entry of entries) {
        await supabase.from("site_settings").upsert(
          { key: entry.key, value: JSON.stringify(entry.value) as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-analytics"] });
      toast.success("Đã lưu cài đặt");
    },
    onError: () => toast.error("Lỗi khi lưu cài đặt"),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cài đặt Website</h1>
          <p className="text-muted-foreground">Cấu hình analytics, tracking scripts và các cài đặt chung</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Google Analytics
            </CardTitle>
            <CardDescription>Nhập Measurement ID để theo dõi lượt truy cập (VD: G-XXXXXXXXXX)</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="ga-id">Measurement ID</Label>
            <Input
              id="ga-id"
              placeholder="G-XXXXXXXXXX"
              value={gaId}
              onChange={(e) => setGaId(e.target.value)}
              className="mt-1 max-w-md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Custom Scripts
            </CardTitle>
            <CardDescription>
              Thêm mã tracking tùy chỉnh (Microsoft Clarity, Facebook Pixel, Hotjar...). Scripts sẽ được inject vào trang.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="head-scripts">Scripts trong &lt;head&gt;</Label>
              <Textarea
                id="head-scripts"
                placeholder={'<script>...</script>\n<!-- hoặc meta tags -->'}
                value={headScripts}
                onChange={(e) => setHeadScripts(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label htmlFor="body-scripts">Scripts trong &lt;body&gt; (cuối trang)</Label>
              <Textarea
                id="body-scripts"
                placeholder={'<script>...</script>\n<!-- noscript tags -->'}
                value={bodyScripts}
                onChange={(e) => setBodyScripts(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderCog className="h-5 w-5" />
              Danh mục mặc định
            </CardTitle>
            <CardDescription>
              Danh mục được gán tự động cho các công cụ chưa được phân loại
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Chọn danh mục mặc định</Label>
            <Select value={defaultCategoryId || "__none"} onValueChange={(v) => setDefaultCategoryId(v === "__none" ? "" : v)}>
              <SelectTrigger className="mt-1 max-w-md">
                <SelectValue placeholder="Chọn danh mục..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Không đặt mặc định</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
        </Button>
      </div>
    </AdminLayout>
  );
}
