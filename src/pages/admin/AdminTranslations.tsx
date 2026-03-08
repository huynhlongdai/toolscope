import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Languages, Globe, FileText, Menu, Download, Upload, BarChart3 } from "lucide-react";
import { ContentTranslationsTab } from "@/components/admin/translations/ContentTranslationsTab";
import { SystemTranslationsTab } from "@/components/admin/translations/SystemTranslationsTab";
import { MenuTranslationsTab } from "@/components/admin/translations/MenuTranslationsTab";
import { toast } from "sonner";

const LOCALES = ["en", "zh", "ja", "ko", "th", "id", "es", "fr", "pt", "de"];

export default function AdminTranslations() {
  const { data: translations = [] } = useQuery({
    queryKey: ["admin-translations-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("translations").select("locale, is_auto");
      return data || [];
    },
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools-count"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("id").eq("status", "published" as any);
      return data || [];
    },
  });
      const { data } = await supabase.from("tools").select("id").eq("status", "approved");
      return data || [];
    },
  });

  const { data: blogs = [] } = useQuery({
    queryKey: ["admin-blogs-count"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_posts").select("id").eq("status", "published");
      return data || [];
    },
  });

  const total = translations.length;
  const autoCount = translations.filter((t: any) => t.is_auto).length;
  const manualCount = total - autoCount;

  // Stats per locale
  const localeStats = LOCALES.map(locale => {
    const count = translations.filter((t: any) => t.locale === locale).length;
    const totalItems = (tools.length + blogs.length) * 2; // name + description fields approx
    const pct = totalItems > 0 ? Math.min(100, Math.round((count / Math.max(totalItems, 1)) * 100)) : 0;
    return { locale, count, pct };
  });

  const exportTranslations = async () => {
    const { data } = await supabase.from("translations").select("*");
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `translations-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${data.length} bản dịch`);
  };

  const importTranslations = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rows = JSON.parse(text);
        if (!Array.isArray(rows)) throw new Error("Invalid");
        let count = 0;
        for (const row of rows) {
          if (row.entity_id && row.locale && row.field_name) {
            await supabase.from("translations").upsert(row, { onConflict: "entity_id,locale,field_name" });
            count++;
          }
        }
        toast.success(`Đã import ${count} bản dịch`);
      } catch {
        toast.error("File JSON không hợp lệ");
      }
    };
    input.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Languages className="h-6 w-6 md:h-7 md:w-7" /> Quản lý bản dịch
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Quản lý dịch thuật nội dung và giao diện hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportTranslations}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={importTranslations}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Import JSON
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng bản dịch</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dịch tự động</CardTitle>
              <Languages className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{autoCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dịch thủ công</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{manualCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ngôn ngữ</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{LOCALES.length}</div></CardContent>
          </Card>
        </div>

        {/* Progress per locale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tiến độ dịch thuật theo ngôn ngữ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {localeStats.map(ls => (
              <div key={ls.locale} className="flex items-center gap-3">
                <Badge variant="outline" className="w-10 justify-center text-xs uppercase">{ls.locale}</Badge>
                <Progress value={ls.pct} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-16 text-right">{ls.count} ({ls.pct}%)</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="content" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Dịch nội dung
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-1.5">
              <Menu className="h-4 w-4" />
              Dịch menu
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              Dịch hệ thống
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <ContentTranslationsTab />
          </TabsContent>

          <TabsContent value="menu" className="mt-4">
            <MenuTranslationsTab />
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <SystemTranslationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
