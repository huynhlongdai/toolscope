import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Database, Settings, FileText, RefreshCw, CheckCircle2 } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";

const BACKUP_TABLES = [
  { key: "tools", label: "Tools", icon: "🔧" },
  { key: "categories", label: "Categories", icon: "📁" },
  { key: "tags", label: "Tags", icon: "🏷️" },
  { key: "reviews", label: "Reviews", icon: "⭐" },
  { key: "blog_posts", label: "Blog Posts", icon: "📝" },
  { key: "site_settings", label: "Site Settings", icon: "⚙️" },
  { key: "menus", label: "Menus", icon: "📋" },
  { key: "pages", label: "Pages", icon: "📄" },
  { key: "translations", label: "Translations", icon: "🌐" },
  { key: "workflows", label: "Workflows", icon: "🔄" },
  { key: "deals", label: "Deals", icon: "🏷️" },
  { key: "tasks", label: "Tasks", icon: "✅" },
];

const SETTINGS_TABLES = ["site_settings", "menus", "pages"];

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminBackup() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const exportFullBackup = async () => {
    setExporting("full");
    try {
      const bundle: Record<string, any> = { _meta: { exported_at: new Date().toISOString(), version: "1.0" } };
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table.key as any).select("*");
        if (error) console.warn(`Skip ${table.key}:`, error.message);
        bundle[table.key] = data ?? [];
      }
      const filename = `toolscope-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(bundle, filename);
      setLastBackup(new Date().toISOString());
      await logAuditAction("backup_export", "system", undefined, { type: "full", tables: BACKUP_TABLES.map(t => t.key) });
      toast.success("Đã export backup thành công!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi export");
    } finally {
      setExporting(null);
    }
  };

  const exportSettings = async () => {
    setExporting("settings");
    try {
      const bundle: Record<string, any> = { _meta: { exported_at: new Date().toISOString(), type: "settings" } };
      for (const table of SETTINGS_TABLES) {
        const { data } = await supabase.from(table as any).select("*");
        bundle[table] = data ?? [];
      }
      downloadJSON(bundle, `toolscope-settings-${new Date().toISOString().slice(0, 10)}.json`);
      await logAuditAction("backup_export", "system", undefined, { type: "settings" });
      toast.success("Đã export settings!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi export");
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async (tableKey: string) => {
    setExporting(tableKey);
    try {
      const { data, error } = await supabase.from(tableKey as any).select("*");
      if (error) throw error;
      if (!data || data.length === 0) { toast.info("Không có dữ liệu"); setExporting(null); return; }
      const headers = Object.keys(data[0]);
      const rows = data.map((row: any) => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableKey}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã export ${tableKey}.csv`);
    } catch (e: any) {
      toast.error(e.message || "Lỗi export CSV");
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta) throw new Error("File không hợp lệ");

      let restored = 0;
      for (const table of SETTINGS_TABLES) {
        if (data[table] && Array.isArray(data[table])) {
          for (const row of data[table]) {
            if (table === "site_settings") {
              await supabase.from("site_settings").upsert(row as any, { onConflict: "key" });
            } else {
              await supabase.from(table as any).upsert(row as any);
            }
          }
          restored++;
        }
      }
      await logAuditAction("backup_import", "system", undefined, { file: file.name, tables_restored: restored });
      toast.success(`Đã import ${restored} bảng settings thành công!`);
    } catch (err: any) {
      toast.error(err.message || "File không hợp lệ");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Backup & Restore</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Export dữ liệu và import khôi phục cài đặt</p>
        </div>

        {lastBackup && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Backup gần nhất: {new Date(lastBackup).toLocaleString("vi-VN")}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Full Database Export</CardTitle>
              <CardDescription>Export toàn bộ dữ liệu quan trọng sang JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Bao gồm: {BACKUP_TABLES.map(t => t.label).join(", ")}</p>
              <Button onClick={exportFullBackup} disabled={exporting === "full"} className="w-full">
                {exporting === "full" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Full Backup (JSON)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Settings Export / Import</CardTitle>
              <CardDescription>Export/Import site_settings, menus, pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportSettings} disabled={exporting === "settings"} variant="outline" className="w-full">
                {exporting === "settings" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Settings (JSON)
              </Button>
              <div className="relative">
                <Button variant="secondary" className="w-full" disabled={importing}>
                  {importing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import Settings
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Export CSV theo bảng</CardTitle>
            <CardDescription>Export từng bảng dữ liệu riêng lẻ dưới dạng CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {BACKUP_TABLES.map((table) => (
                <Button
                  key={table.key}
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(table.key)}
                  disabled={exporting === table.key}
                  className="justify-start"
                >
                  {exporting === table.key ? (
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <span className="mr-2">{table.icon}</span>
                  )}
                  {table.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
