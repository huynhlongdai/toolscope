import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

export function TranslateButton({ toolId, toolName }: { toolId: string; toolName: string }) {
  const [translating, setTranslating] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleTranslate = async (locale: string) => {
    setTranslating(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("translate-tool", {
        body: { tool_id: toolId, locale },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const localeMeta = SUPPORTED_LOCALES[locale as Locale];
      toast.success(`Đã dịch "${toolName}" sang ${localeMeta?.nativeName || locale} (${data.saved} trường)`);
      queryClient.invalidateQueries({ queryKey: ["admin-tools-translation-map"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi dịch tự động");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" disabled={translating} title="Dịch tool" className="h-8 w-8">
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {TARGET_LOCALES.map(([code, meta]) => (
          <Button key={code} variant="ghost" size="sm" className="w-full justify-start text-sm h-8" onClick={() => handleTranslate(code)}>
            {meta.flag} {meta.nativeName}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
