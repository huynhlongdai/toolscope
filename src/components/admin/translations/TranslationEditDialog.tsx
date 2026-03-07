import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface TranslationEditDialogProps {
  item: any;
  onClose: () => void;
  onSave: (id: string, text: string) => void;
  onChange: (item: any) => void;
}

export function TranslationEditDialog({ item, onClose, onSave, onChange }: TranslationEditDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Chỉnh sửa bản dịch</DialogTitle></DialogHeader>
        {item && (
          <div className="space-y-4">
            <div>
              <Label>Field: {item.field_name}</Label>
              <p className="text-xs text-muted-foreground">Locale: {item.locale}</p>
            </div>
            <div className="space-y-2">
              <Label>Nội dung dịch</Label>
              <Textarea
                value={item.translated_text}
                onChange={(e) => onChange({ ...item, translated_text: e.target.value })}
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button onClick={() => onSave(item.id, item.translated_text)}>
                <CheckCircle className="mr-1 h-4 w-4" /> Lưu
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
