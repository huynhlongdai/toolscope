import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiffItem {
  field_name: string;
  translated_text: string;
  originalText: string;
  locale: string;
  is_auto: boolean;
}

interface TranslationDiffDialogProps {
  item: DiffItem | null;
  onClose: () => void;
}

export function TranslationDiffDialog({ item, onClose }: TranslationDiffDialogProps) {
  if (!item) return null;

  const original = item.originalText || "(Không có nội dung gốc)";
  const translated = item.translated_text || "(Chưa dịch)";

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            So sánh: {item.field_name}
            <Badge variant={item.is_auto ? "secondary" : "default"} className="text-xs">
              {item.is_auto ? "AI" : "Thủ công"}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">🇻🇳 Nội dung gốc (VI)</p>
            <ScrollArea className="h-[400px] rounded-md border p-3 bg-muted/30">
              <div className="text-sm whitespace-pre-wrap break-words">{original}</div>
            </ScrollArea>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">🇬🇧 Bản dịch ({item.locale.toUpperCase()})</p>
            <ScrollArea className="h-[400px] rounded-md border p-3 bg-primary/5">
              <div className="text-sm whitespace-pre-wrap break-words">{translated}</div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
