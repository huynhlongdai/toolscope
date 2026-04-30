import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

export function BatchTranslateButton({ tools, isMobile }: { tools: any[]; isMobile: boolean }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batchLocale, setBatchLocale] = useState<Locale>("en");
  const queryClient = useQueryClient();

  const handleBatchTranslate = async () => {
    const publishedTools = tools.filter((t: any) => t.status === "published");
    if (publishedTools.length === 0) { toast.error("Không có tool published nào"); return; }
    const localeMeta = SUPPORTED_LOCALES[batchLocale];
    if (!confirm(`Dịch ${publishedTools.length} tools sang ${localeMeta.nativeName}?`)) return;

    setRunning(true);
    setProgress({ done: 0, total: publishedTools.length });

    let successCount = 0;
    let errorCount = 0;

    for (const tool of publishedTools) {
      try {
        const { data, error } = await supabase.functions.invoke("translate-tool", {
          body: { tool_id: tool.id, locale: batchLocale },
        });
        if (error || data?.error) throw error || new Error(data?.error);
        successCount++;
      } catch {
        errorCount++;
      }
      setProgress(prev => ({ ...prev, done: prev.done + 1 }));
      await new Promise(r => setTimeout(r, 1500));
    }

    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["admin-tools-translation-map"] });
    toast.success(`Hoàn tất: ${successCount} thành công, ${errorCount} lỗi`);
  };

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-2" align="end">
          <p className="text-xs font-medium">Dịch hàng loạt</p>
          <Select value={batchLocale} onValueChange={(v) => setBatchLocale(v as Locale)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full" onClick={handleBatchTranslate} disabled={running}>
            {running ? `${progress.done}/${progress.total}` : "Bắt đầu dịch"}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={batchLocale} onValueChange={(v) => setBatchLocale(v as Locale)}>
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TARGET_LOCALES.map(([code, meta]) => (
            <SelectItem key={code} value={code}>{meta.flag} {meta.nativeName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={handleBatchTranslate} disabled={running}>
        {running ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <Languages className="mr-1 h-3.5 w-3.5" /> Dịch hàng loạt
          </>
        )}
      </Button>
    </div>
  );
}
