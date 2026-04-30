import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save, Blocks } from "lucide-react";
import { MODULE_DEFINITIONS, MODULE_CATEGORIES } from "@/hooks/useModules";
import { toast } from "sonner";
import { logAuditAction } from "@/hooks/useAuditLog";

interface ModulesTabProps {
  localModules: Record<string, boolean>;
  setLocalModules: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSave: (modules: Record<string, boolean>) => void;
  isSaving: boolean;
}

export function ModulesTab({ localModules, setLocalModules, onSave, isSaving }: ModulesTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Blocks className="h-5 w-5" /> Quản lý Module</CardTitle>
          <CardDescription>Bật/tắt các tính năng của website. Module tắt sẽ ẩn khỏi menu và giao diện.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(MODULE_CATEGORIES).map(([catKey, catLabel]) => {
            const modules = MODULE_DEFINITIONS.filter((m) => m.category === catKey);
            if (modules.length === 0) return null;
            return (
              <div key={catKey} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{catLabel}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {modules.map((mod) => (
                    <div
                      key={mod.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${localModules[mod.id] ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                      <span className="text-xl mt-0.5">{mod.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="font-medium text-sm">{mod.label}</Label>
                          <Switch
                            checked={localModules[mod.id] ?? false}
                            onCheckedChange={(v) => setLocalModules((prev) => ({ ...prev, [mod.id]: v }))}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Button
        onClick={() => {
          onSave(localModules);
          logAuditAction("modules_save", "site_settings", undefined, { modules: localModules });
          toast.success("Đã lưu cấu hình module");
        }}
        disabled={isSaving}
      >
        <Save className="mr-2 h-4 w-4" /> {isSaving ? "Đang lưu..." : "Lưu cấu hình Module"}
      </Button>
    </div>
  );
}
