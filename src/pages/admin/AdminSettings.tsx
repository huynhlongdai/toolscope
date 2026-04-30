import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Code, Brain, Settings2, Blocks, AlertTriangle, Megaphone } from "lucide-react";
import { AdsSettingsTab } from "@/components/admin/AdsSettingsTab";
import { useModules } from "@/hooks/useModules";
import { logAuditAction } from "@/hooks/useAuditLog";
import { AIProvidersTab } from "@/components/admin/settings/AIProvidersTab";
import { SiteInfoTab } from "@/components/admin/settings/SiteInfoTab";
import { AnalyticsTab } from "@/components/admin/settings/AnalyticsTab";
import { ScriptsTab } from "@/components/admin/settings/ScriptsTab";
import { ModulesTab } from "@/components/admin/settings/ModulesTab";
import { DangerZoneTab } from "@/components/admin/settings/DangerZoneTab";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { modulesConfig, saveMutation: saveModulesMutation } = useModules();
  const [localModules, setLocalModules] = useState<Record<string, boolean>>({});
  const [gaId, setGaId] = useState("");
  const [headScripts, setHeadScripts] = useState("");
  const [bodyScripts, setBodyScripts] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  const [siteInfo, setSiteInfo] = useState({
    site_name: "", site_description: "", site_logo_url: "", default_language: "vi",
    contact_email: "", footer_copyright: "", maintenance_mode: false,
    social_facebook: "", social_twitter: "", social_youtube: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, icon").is("parent_id", null).order("sort_order");
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value; });
      return map;
    },
  });

  const { data: aiKeyData } = useQuery({
    queryKey: ["admin-ai-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "get" },
      });
      if (error) throw error;
      return data;
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

  useEffect(() => { setLocalModules(modulesConfig); }, [modulesConfig]);

  useEffect(() => {
    if (aiKeyData?.site_info) setSiteInfo(prev => ({ ...prev, ...aiKeyData.site_info }));
  }, [aiKeyData]);

  const saveGeneralMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "ga_measurement_id", value: gaId },
        { key: "custom_head_scripts", value: headScripts },
        { key: "custom_body_scripts", value: bodyScripts },
        { key: "default_category_id", value: defaultCategoryId },
        { key: "site_info", value: siteInfo },
      ];
      for (const entry of entries) {
        await supabase.from("site_settings").upsert(
          { key: entry.key, value: typeof entry.value === "string" ? JSON.stringify(entry.value) : entry.value as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      logAuditAction("settings_save", "site_settings", undefined, { keys: ["ga_measurement_id", "site_info"] });
      toast.success("Đã lưu cài đặt");
    },
    onError: () => toast.error("Lỗi khi lưu cài đặt"),
  });

  const isDev = window.location.hostname.includes("localhost") || window.location.hostname.includes("preview") || window.location.hostname.includes("lovable");

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Cài đặt Website</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Cấu hình AI providers, analytics, site info</p>
          </div>
          <Badge variant={isDev ? "secondary" : "destructive"} className="text-xs ml-auto">
            {isDev ? "🔧 Development" : "🚀 Production"}
          </Badge>
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ai" className="gap-1.5 text-xs md:text-sm"><Brain className="h-3.5 w-3.5" /> AI</TabsTrigger>
            <TabsTrigger value="site" className="gap-1.5 text-xs md:text-sm"><Settings2 className="h-3.5 w-3.5" /> Site</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs md:text-sm"><Globe className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="scripts" className="gap-1.5 text-xs md:text-sm"><Code className="h-3.5 w-3.5" /> Scripts</TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5 text-xs md:text-sm"><Blocks className="h-3.5 w-3.5" /> Modules</TabsTrigger>
            <TabsTrigger value="ads" className="gap-1.5 text-xs md:text-sm"><Megaphone className="h-3.5 w-3.5" /> Quảng cáo</TabsTrigger>
            <TabsTrigger value="danger" className="gap-1.5 text-xs md:text-sm text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Danger</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
            <AIProvidersTab />
          </TabsContent>

          <TabsContent value="site" className="space-y-6">
            <SiteInfoTab
              siteInfo={siteInfo}
              setSiteInfo={setSiteInfo}
              defaultCategoryId={defaultCategoryId}
              setDefaultCategoryId={setDefaultCategoryId}
              categories={categories}
              onSave={() => saveGeneralMutation.mutate()}
              isSaving={saveGeneralMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab
              gaId={gaId}
              setGaId={setGaId}
              onSave={() => saveGeneralMutation.mutate()}
              isSaving={saveGeneralMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="scripts" className="space-y-6">
            <ScriptsTab
              headScripts={headScripts}
              setHeadScripts={setHeadScripts}
              bodyScripts={bodyScripts}
              setBodyScripts={setBodyScripts}
              onSave={() => saveGeneralMutation.mutate()}
              isSaving={saveGeneralMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <ModulesTab
              localModules={localModules}
              setLocalModules={setLocalModules}
              onSave={(modules) => saveModulesMutation.mutate(modules)}
              isSaving={saveModulesMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="danger" className="space-y-6">
            <DangerZoneTab />
          </TabsContent>

          <TabsContent value="ads">
            <AdsSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
