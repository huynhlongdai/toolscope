import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Megaphone, Eye, EyeOff, Code, Monitor, X } from "lucide-react";

const AD_SLOTS = [
  { id: "hero_below", label: "Dưới Hero (Trang chủ)", page: "Index", defaultFormat: "horizontal" },
  { id: "footer_above", label: "Trên Footer (Toàn site)", page: "All", defaultFormat: "horizontal" },
  { id: "between_tools", label: "Giữa danh sách Tools", page: "Tools, Category", defaultFormat: "auto" },
  { id: "tool_detail_top", label: "Trên nội dung Tool Detail", page: "Tool Detail", defaultFormat: "horizontal" },
  { id: "tool_detail_mid", label: "Giữa bài viết Tool Detail", page: "Tool Detail", defaultFormat: "rectangle" },
  { id: "blog_mid", label: "Giữa nội dung Blog", page: "Blog Detail", defaultFormat: "rectangle" },
  { id: "sidebar", label: "Sidebar", page: "Tool Detail, Blog", defaultFormat: "vertical" },
];

interface SlotConfig {
  enabled: boolean;
  mode: "adsense" | "custom";
  slot_id: string;
  format: string;
  custom_code: string;
}

interface AdsConfig {
  enabled: boolean;
  client_id: string;
  slots: Record<string, SlotConfig>;
}

const DEFAULT_SLOT: SlotConfig = {
  enabled: false,
  mode: "adsense",
  slot_id: "",
  format: "auto",
  custom_code: "",
};

export function AdsSettingsTab() {
  const queryClient = useQueryClient();
  const [previewSlot, setPreviewSlot] = useState<string | null>(null);
  const [config, setConfig] = useState<AdsConfig>({
    enabled: false,
    client_id: "",
    slots: {},
  });

  const { data: savedConfig } = useQuery({
    queryKey: ["ads-config-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "ads_config")
        .maybeSingle();
      if (!data?.value) return null;
      return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        enabled: savedConfig.enabled ?? false,
        client_id: savedConfig.client_id ?? "",
        slots: savedConfig.slots ?? {},
      });
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("site_settings").upsert(
        { key: "ads_config", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-config"] });
      queryClient.invalidateQueries({ queryKey: ["ads-config-admin"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings-analytics"] });
      toast.success("Đã lưu cấu hình quảng cáo");
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  const getSlot = (slotId: string): SlotConfig => config.slots[slotId] || { ...DEFAULT_SLOT };

  const updateSlot = (slotId: string, updates: Partial<SlotConfig>) => {
    setConfig(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slotId]: { ...getSlot(slotId), ...updates },
      },
    }));
  };

  const enabledCount = AD_SLOTS.filter(s => getSlot(s.id).enabled).length;

  return (
    <div className="space-y-6">
      {/* Global config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Cấu hình quảng cáo
          </CardTitle>
          <CardDescription>
            Quản lý Google AdSense và Custom Ad Scripts trên toàn site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Bật quảng cáo</Label>
              <p className="text-xs text-muted-foreground">Bật/tắt toàn bộ quảng cáo trên site</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Google AdSense Client ID</Label>
            <Input
              value={config.client_id}
              onChange={(e) => setConfig(prev => ({ ...prev, client_id: e.target.value }))}
              placeholder="ca-pub-1234567890123456"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Chỉ cần nếu bạn dùng Google AdSense. Bỏ qua nếu dùng Custom Script.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge variant={config.enabled ? "default" : "secondary"}>
              {config.enabled ? "Đang bật" : "Đang tắt"}
            </Badge>
            <span className="text-muted-foreground">
              {enabledCount}/{AD_SLOTS.length} vị trí đang hoạt động
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Per-slot config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Vị trí quảng cáo
          </CardTitle>
          <CardDescription>Cấu hình chi tiết từng vị trí</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {AD_SLOTS.map((adSlot) => {
            const slot = getSlot(adSlot.id);
            return (
              <div key={adSlot.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{adSlot.label}</span>
                      <Badge variant="outline" className="text-[10px]">{adSlot.page}</Badge>
                      {slot.enabled && (
                        <Badge variant={slot.mode === "adsense" ? "default" : "secondary"} className="text-[10px]">
                          {slot.mode === "adsense" ? "AdSense" : "Custom"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Slot: {adSlot.id}</p>
                  </div>
                  <Switch
                    checked={slot.enabled}
                    onCheckedChange={(v) => updateSlot(adSlot.id, { enabled: v })}
                  />
                </div>

                {slot.enabled && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Loại quảng cáo</Label>
                        <Select
                          value={slot.mode}
                          onValueChange={(v) => updateSlot(adSlot.id, { mode: v as "adsense" | "custom" })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adsense">Google AdSense</SelectItem>
                            <SelectItem value="custom">Custom Script</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {slot.mode === "adsense" && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Ad Slot ID</Label>
                            <Input
                              value={slot.slot_id}
                              onChange={(e) => updateSlot(adSlot.id, { slot_id: e.target.value })}
                              placeholder="1234567890"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Format</Label>
                            <Select
                              value={slot.format || adSlot.defaultFormat}
                              onValueChange={(v) => updateSlot(adSlot.id, { format: v })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="horizontal">Horizontal</SelectItem>
                                <SelectItem value="vertical">Vertical</SelectItem>
                                <SelectItem value="rectangle">Rectangle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    {slot.mode === "custom" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Code className="h-3 w-3" /> Custom HTML/JS Code
                        </Label>
                        <Textarea
                          value={slot.custom_code}
                          onChange={(e) => updateSlot(adSlot.id, { custom_code: e.target.value })}
                          placeholder="<script>...</script> hoặc HTML quảng cáo"
                          className="font-mono text-xs min-h-[100px]"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Dán mã HTML/JS từ mạng quảng cáo bất kỳ (MGID, PropellerAds, affiliate banner, v.v.)
                        </p>
                      </div>
                    )}

                    {/* Preview button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setPreviewSlot(previewSlot === adSlot.id ? null : adSlot.id)}
                    >
                      {previewSlot === adSlot.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {previewSlot === adSlot.id ? "Ẩn preview" : "Xem preview"}
                    </Button>

                    {/* Preview panel */}
                    {previewSlot === adSlot.id && (
                      <AdPreviewPanel slot={slot} clientId={config.client_id} slotDef={adSlot} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình quảng cáo"}
      </Button>
    </div>
  );
}
