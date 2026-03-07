import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages, RefreshCw } from "lucide-react";

interface UntranslatedSectionProps {
  untranslatedTools: any[];
  untranslatedBlogs: any[];
  onTranslate: (id: string) => void;
  isTranslating: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function UntranslatedSection({
  untranslatedTools, untranslatedBlogs,
  onTranslate, isTranslating,
  selectedIds, onToggleSelect,
}: UntranslatedSectionProps) {
  if (untranslatedTools.length === 0 && untranslatedBlogs.length === 0) return null;

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
      {untranslatedTools.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">⚠️ Tools chưa dịch ({untranslatedTools.length})</h3>
          <div className="flex flex-wrap gap-2">
            {untranslatedTools.slice(0, 20).map((t: any) => (
              <div key={t.id} className="flex items-center gap-1">
                <Checkbox
                  checked={selectedIds.has(t.id)}
                  onCheckedChange={() => onToggleSelect(t.id)}
                  className="h-3.5 w-3.5"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTranslate(t.id)}
                  disabled={isTranslating}
                  className="text-xs"
                >
                  {isTranslating ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                  {t.name}
                </Button>
              </div>
            ))}
            {untranslatedTools.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">+{untranslatedTools.length - 20} khác</span>
            )}
          </div>
        </div>
      )}
      {untranslatedBlogs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">📝 Blog chưa dịch ({untranslatedBlogs.length})</h3>
          <p className="text-xs text-muted-foreground">Chức năng dịch blog sẽ được hỗ trợ sớm</p>
        </div>
      )}
    </div>
  );
}
