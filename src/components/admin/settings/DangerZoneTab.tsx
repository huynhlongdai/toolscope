import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/hooks/useAuditLog";

export function DangerZoneTab() {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
          <CardDescription>Các thao tác nguy hiểm, không thể hoàn tác</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Reset tất cả cài đặt</p>
              <p className="text-xs text-muted-foreground">Xóa tất cả site_settings, khôi phục về mặc định</p>
            </div>
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!confirm("⚠️ Xóa TẤT CẢ cài đặt? Hành động này không thể hoàn tác!")) return;
              if (!confirm("Xác nhận lần 2: Bạn chắc chắn muốn reset?")) return;
              const { error } = await supabase.from("site_settings").delete().neq("key", "");
              if (error) { toast.error("Lỗi reset"); return; }
              queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
              await logAuditAction("reset_all_settings", "site_settings");
              toast.success("Đã reset tất cả cài đặt");
            }}>
              Reset All Settings
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Xóa cache translations</p>
              <p className="text-xs text-muted-foreground">Xóa tất cả bản dịch tự động (is_auto = true)</p>
            </div>
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!confirm("Xóa tất cả bản dịch tự động?")) return;
              const { error } = await supabase.from("translations").delete().eq("is_auto", true);
              if (error) { toast.error("Lỗi xóa"); return; }
              await logAuditAction("clear_auto_translations", "translations");
              toast.success("Đã xóa bản dịch tự động");
            }}>
              Clear Auto Translations
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Xóa search logs</p>
              <p className="text-xs text-muted-foreground">Xóa toàn bộ lịch sử tìm kiếm</p>
            </div>
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!confirm("Xóa toàn bộ search logs?")) return;
              const { error } = await supabase.from("search_logs").delete().neq("id", "");
              if (error) { toast.error("Lỗi xóa"); return; }
              await logAuditAction("clear_search_logs", "search_logs");
              toast.success("Đã xóa search logs");
            }}>
              Clear Search Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
