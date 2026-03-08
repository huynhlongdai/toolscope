import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages, RefreshCw } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

interface UntranslatedSectionProps {
  untranslatedTools: any[];
  untranslatedBlogs: any[];
  untranslatedMenus?: any[];
  untranslatedWorkflows?: any[];
  untranslatedDeals?: any[];
  onTranslateTool: (id: string) => void;
  onTranslateBlog: (id: string) => void;
  onTranslateMenu?: (id: string) => void;
  onTranslateWorkflow?: (id: string) => void;
  onTranslateDeal?: (id: string) => void;
  onBulkTranslateBlogs?: (ids: string[]) => void;
  onBulkTranslateWorkflows?: (ids: string[]) => void;
  onBulkTranslateDeals?: (ids: string[]) => void;
  isTranslating: boolean;
  selectedToolIds: Set<string>;
  onToggleSelectTool: (id: string) => void;
  selectedBlogIds: Set<string>;
  onToggleSelectBlog: (id: string) => void;
  selectedWorkflowIds?: Set<string>;
  onToggleSelectWorkflow?: (id: string) => void;
  selectedDealIds?: Set<string>;
  onToggleSelectDeal?: (id: string) => void;
  targetLocale: Locale;
}

export function UntranslatedSection({
  untranslatedTools, untranslatedBlogs, untranslatedMenus = [], untranslatedWorkflows = [], untranslatedDeals = [],
  onTranslateTool, onTranslateBlog, onTranslateMenu, onTranslateWorkflow, onTranslateDeal,
  onBulkTranslateBlogs, onBulkTranslateWorkflows, onBulkTranslateDeals,
  isTranslating,
  selectedToolIds, onToggleSelectTool,
  selectedBlogIds, onToggleSelectBlog,
  selectedWorkflowIds = new Set(), onToggleSelectWorkflow,
  selectedDealIds = new Set(), onToggleSelectDeal,
  targetLocale,
}: UntranslatedSectionProps) {
  if (untranslatedTools.length === 0 && untranslatedBlogs.length === 0 && untranslatedMenus.length === 0 && untranslatedWorkflows.length === 0 && untranslatedDeals.length === 0) return null;

  const targetName = SUPPORTED_LOCALES[targetLocale]?.nativeName || targetLocale;

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
      {/* Tools */}
      {untranslatedTools.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">⚠️ Tools chưa dịch sang {targetName} ({untranslatedTools.length})</h3>
          <div className="flex flex-wrap gap-2">
            {untranslatedTools.slice(0, 20).map((t: any) => (
              <div key={t.id} className="flex items-center gap-1">
                <Checkbox
                  checked={selectedToolIds.has(t.id)}
                  onCheckedChange={() => onToggleSelectTool(t.id)}
                  className="h-3.5 w-3.5"
                />
                <Button variant="outline" size="sm" onClick={() => onTranslateTool(t.id)} disabled={isTranslating} className="text-xs">
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

      {/* Blogs */}
      {untranslatedBlogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">📝 Blog chưa dịch sang {targetName} ({untranslatedBlogs.length})</h3>
            {onBulkTranslateBlogs && selectedBlogIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => onBulkTranslateBlogs(Array.from(selectedBlogIds))} disabled={isTranslating} className="text-xs">
                <Languages className="mr-1 h-3 w-3" /> Dịch {selectedBlogIds.size} blog
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {untranslatedBlogs.slice(0, 20).map((b: any) => (
              <div key={b.id} className="flex items-center gap-1">
                <Checkbox
                  checked={selectedBlogIds.has(b.id)}
                  onCheckedChange={() => onToggleSelectBlog(b.id)}
                  className="h-3.5 w-3.5"
                />
                <Button variant="outline" size="sm" onClick={() => onTranslateBlog(b.id)} disabled={isTranslating} className="text-xs">
                  {isTranslating ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                  {b.title?.substring(0, 40)}{b.title?.length > 40 ? "..." : ""}
                </Button>
              </div>
            ))}
            {untranslatedBlogs.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">+{untranslatedBlogs.length - 20} khác</span>
            )}
          </div>
        </div>
      )}

      {/* Workflows */}
      {untranslatedWorkflows.length > 0 && onTranslateWorkflow && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">🔄 Workflow chưa dịch sang {targetName} ({untranslatedWorkflows.length})</h3>
            {onBulkTranslateWorkflows && selectedWorkflowIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => onBulkTranslateWorkflows(Array.from(selectedWorkflowIds))} disabled={isTranslating} className="text-xs">
                <Languages className="mr-1 h-3 w-3" /> Dịch {selectedWorkflowIds.size} workflow
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {untranslatedWorkflows.slice(0, 20).map((w: any) => (
              <div key={w.id} className="flex items-center gap-1">
                {onToggleSelectWorkflow && (
                  <Checkbox
                    checked={selectedWorkflowIds.has(w.id)}
                    onCheckedChange={() => onToggleSelectWorkflow(w.id)}
                    className="h-3.5 w-3.5"
                  />
                )}
                <Button variant="outline" size="sm" onClick={() => onTranslateWorkflow(w.id)} disabled={isTranslating} className="text-xs">
                  {isTranslating ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                  {w.title?.substring(0, 40)}{w.title?.length > 40 ? "..." : ""}
                </Button>
              </div>
            ))}
            {untranslatedWorkflows.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">+{untranslatedWorkflows.length - 20} khác</span>
            )}
          </div>
        </div>
      )}

      {/* Menus */}
      {untranslatedMenus.length > 0 && onTranslateMenu && (
        <div>
          <h3 className="text-sm font-medium mb-2">🔗 Menu chưa dịch sang {targetName} ({untranslatedMenus.length})</h3>
          <div className="flex flex-wrap gap-2">
            {untranslatedMenus.map((m: any) => (
              <Button key={m.id} variant="outline" size="sm" onClick={() => onTranslateMenu(m.id)} disabled={isTranslating} className="text-xs">
                {isTranslating ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
                {m.name} ({m.location})
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
