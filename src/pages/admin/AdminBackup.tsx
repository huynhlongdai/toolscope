import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToJSON, exportCSVLines, dateStampedFilename } from "@/lib/export";
import { Download, Upload, Database, Settings, FileText, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
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
  { key: "user_roles", label: "User Roles", icon: "👤" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "follows", label: "Follows", icon: "➕" },
  { key: "collections", label: "Collections", icon: "📦" },
  { key: "launches", label: "Launches", icon: "🚀" },
];

const SETTINGS_TABLES = ["site_settings", "menus", "pages"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RowValidation {
  valid: any[];
  invalidCount: number;
  reasons: string[]; // sample of distinct reasons, for display
}

// P3-1: validate rows BEFORE upsert, instead of blindly upserting whatever
// the JSON file contains. Each row must be a plain object and carry a
// correctly-typed identifying key (`key` for site_settings, a UUID-shaped
// `id` for every other table) — rows failing this are excluded from the
// import and surfaced to the admin instead of silently hitting the DB and
// (in the previous version) being counted as "restored" regardless of the
// upsert's actual result.
function validateTableRows(tableKey: string, rows: unknown[]): RowValidation {
  const valid: any[] = [];
  const reasonSet = new Set<string>();
  let invalidCount = 0;
  for (const row of rows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      invalidCount++; reasonSet.add("Dòng không phải object hợp lệ"); continue;
    }
    if (tableKey === "site_settings") {
      if (typeof (row as any).key !== "string" || !(row as any).key.trim()) {
        invalidCount++; reasonSet.add("Thiếu trường 'key' hợp lệ"); continue;
      }
    } else {
      const id = (row as any).id;
      if (typeof id !== "string" || !UUID_RE.test(id)) {
        invalidCount++; reasonSet.add("Thiếu hoặc sai định dạng 'id' (UUID)"); continue;
      }
    }
    valid.push(row);
  }
  return { valid, invalidCount, reasons: Array.from(reasonSet) };
}

export default function AdminBackup() {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<Record<string, any> | null>(null);
  const [importValidation, setImportValidation] = useState<Record<string, RowValidation>>({});
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [currentCounts, setCurrentCounts] = useState<Record<string, number>>({});

  const { data: backupHistory = [] } = useQuery({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "backup_history").maybeSingle();
      return (data?.value as any[]) || [];
    },
  });

  const saveBackupHistory = async (entry: any) => {
    const updated = [entry, ...backupHistory].slice(0, 20);
    await supabase.from("site_settings").upsert({ key: "backup_history", value: updated as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    queryClient.invalidateQueries({ queryKey: ["backup-history"] });
  };

  const exportFullBackup = async () => {
    setExporting("full");
    try {
      const bundle: Record<string, any> = { _meta: { exported_at: new Date().toISOString(), version: "1.0" } };
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table.key as any).select("*");
        if (error) console.warn(`Skip ${table.key}:`, error.message);
        bundle[table.key] = data ?? [];
      }
      const filename = dateStampedFilename("toolscope-backup", "json");
      exportToJSON(bundle, filename);
      setLastBackup(new Date().toISOString());
      await saveBackupHistory({ type: "full", tables: BACKUP_TABLES.length, timestamp: new Date().toISOString() });
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
      exportToJSON(bundle, dateStampedFilename("toolscope-settings", "json"));
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
      const csv = [headers.join(","), ...rows];
      exportCSVLines(csv, dateStampedFilename(tableKey, "csv"));
      toast.success(`Đã export ${tableKey}.csv`);
    } catch (e: any) {
      toast.error(e.message || "Lỗi export CSV");
    } finally {
      setExporting(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta) throw new Error("File không hợp lệ");

      // Find which tables exist in the file
      const availableTables = BACKUP_TABLES.filter(t => data[t.key] && Array.isArray(data[t.key]));
      if (availableTables.length === 0) throw new Error("File không chứa bảng nào hợp lệ để import");
      setImportData(data);

      // Validate every row up front so the confirmation dialog shows exactly
      // what will (and will not) be imported, instead of finding out after
      // hitting the database.
      const validation: Record<string, RowValidation> = {};
      for (const t of availableTables) {
        validation[t.key] = validateTableRows(t.key, data[t.key]);
      }
      setImportValidation(validation);

      // Only pre-select tables that have at least one valid row.
      setSelectedTables(new Set(availableTables.filter(t => validation[t.key].valid.length > 0).map(t => t.key)));

      // Fetch current counts for comparison
      const counts: Record<string, number> = {};
      for (const t of availableTables) {
        const { count } = await supabase.from(t.key as any).select("*", { count: "exact", head: true });
        counts[t.key] = count || 0;
      }
      setCurrentCounts(counts);
      setImportDialogOpen(true);
    } catch (err: any) {
      toast.error(err.message || "File không hợp lệ");
    }
    e.target.value = "";
  };

  const executeImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      let tablesRestored = 0;
      let rowsImported = 0;
      let rowsSkippedInvalid = 0;
      let rowsFailedUpsert = 0;
      const failedTables: string[] = [];

      for (const tableKey of selectedTables) {
        const validation = importValidation[tableKey];
        if (!validation) continue;
        rowsSkippedInvalid += validation.invalidCount;
        if (validation.valid.length === 0) continue;

        let tableHadError = false;
        for (const row of validation.valid) {
          const { error } = tableKey === "site_settings"
            ? await supabase.from("site_settings").upsert(row as any, { onConflict: "key" })
            : await supabase.from(tableKey as any).upsert(row as any);
          if (error) { tableHadError = true; rowsFailedUpsert++; } else { rowsImported++; }
        }
        if (tableHadError) failedTables.push(tableKey);
        tablesRestored++;
      }

      await saveBackupHistory({
        type: "import", tables: tablesRestored, timestamp: new Date().toISOString(),
        rows_imported: rowsImported, rows_skipped_invalid: rowsSkippedInvalid, rows_failed: rowsFailedUpsert,
      });
      await logAuditAction("backup_import", "system", undefined, {
        tables_restored: tablesRestored, rows_imported: rowsImported,
        rows_skipped_invalid: rowsSkippedInvalid, rows_failed_upsert: rowsFailedUpsert, failed_tables: failedTables,
      });

      if (rowsFailedUpsert > 0) {
        toast.error(`Import xong nhưng ${rowsFailedUpsert} dòng lỗi ở bảng: ${failedTables.join(", ")}`);
      } else if (rowsSkippedInvalid > 0) {
        toast.success(`Đã import ${rowsImported} dòng (${tablesRestored} bảng). Bỏ qua ${rowsSkippedInvalid} dòng không hợp lệ.`);
      } else {
        toast.success(`Đã import ${rowsImported} dòng thành công (${tablesRestored} bảng)!`);
      }
      setImportDialogOpen(false);
      setImportData(null);
      setImportValidation({});
    } catch (err: any) {
      toast.error(err.message || "Lỗi import");
    } finally {
      setImporting(false);
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

        {/* Backup History */}
        {backupHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Lịch sử Backup</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {backupHistory.slice(0, 10).map((h: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {h.type === "full" ? "📦 Full" : h.type === "import" ? "📥 Import" : "⚙️ Settings"} — {h.tables} bảng — {new Date(h.timestamp).toLocaleDateString("vi-VN")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Full Database Export</CardTitle>
              <CardDescription>Export toàn bộ {BACKUP_TABLES.length} bảng dữ liệu sang JSON</CardDescription>
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
                  Import (Chọn bảng)
                </Button>
                <input type="file" accept=".json" onChange={handleImportFile} className="absolute inset-0 opacity-0 cursor-pointer" />
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
                <Button key={table.key} variant="outline" size="sm" onClick={() => exportCSV(table.key)} disabled={exporting === table.key} className="justify-start">
                  {exporting === table.key ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <span className="mr-2">{table.icon}</span>}
                  {table.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selective Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Chọn bảng để import</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {importData && BACKUP_TABLES.filter(t => importData[t.key] && Array.isArray(importData[t.key])).map(table => {
              const fileCount = importData[table.key].length;
              const dbCount = currentCounts[table.key] || 0;
              const validation = importValidation[table.key];
              const validCount = validation?.valid.length ?? fileCount;
              const invalidCount = validation?.invalidCount ?? 0;
              const noValidRows = validCount === 0;
              return (
                <div key={table.key} className={`flex items-center gap-3 p-2 rounded border ${noValidRows ? "opacity-60" : ""}`}>
                  <Checkbox
                    checked={selectedTables.has(table.key)}
                    disabled={noValidRows}
                    onCheckedChange={(v) => {
                      setSelectedTables(prev => {
                        const n = new Set(prev);
                        v ? n.add(table.key) : n.delete(table.key);
                        return n;
                      });
                    }}
                  />
                  <span className="text-lg">{table.icon}</span>
                  <div className="flex-1">
                    <Label className="font-medium text-sm">{table.label}</Label>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>File: {fileCount} rows</span>
                      <span>DB: {dbCount} rows</span>
                      {fileCount !== dbCount && (
                        <Badge variant="outline" className="text-[10px]">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {fileCount > dbCount ? `+${fileCount - dbCount}` : `${fileCount - dbCount}`}
                        </Badge>
                      )}
                      {invalidCount > 0 && (
                        <Badge variant="destructive" className="text-[10px]" title={validation?.reasons.join("; ")}>
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {invalidCount} dòng không hợp lệ
                        </Badge>
                      )}
                    </div>
                    {invalidCount > 0 && validation?.reasons.length > 0 && (
                      <p className="text-[11px] text-destructive mt-0.5">{validation.reasons.join("; ")}</p>
                    )}
                    {noValidRows && (
                      <p className="text-[11px] text-destructive mt-0.5">Không có dòng hợp lệ nào — không thể import bảng này</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Hủy</Button>
            <Button onClick={executeImport} disabled={importing || selectedTables.size === 0}>
              {importing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import {selectedTables.size} bảng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
