import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Clock, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

type BatchItem = {
  url: string;
  status: "pending" | "processing" | "done" | "error";
  name?: string;
  error?: string;
};

export function BatchImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [urlsText, setUrlsText] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const parseUrls = () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) {
      toast.error("Nhập ít nhất 1 URL");
      return;
    }
    if (urls.length > 50) {
      toast.error("Tối đa 50 URL mỗi lần");
      return;
    }
    setItems(urls.map((url) => ({ url, status: "pending" })));
  };

  const startImport = async () => {
    if (items.length === 0) return;
    setRunning(true);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
      );

      try {
        const { data, error } = await supabase.functions.invoke("collect-tool-data", {
          body: { url: items[i].url, save_to_db: true },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "done", name: data.name || items[i].url } : item
          )
        );
      } catch (e: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: e.message || "Lỗi không xác định" } : item
          )
        );
      }

      if (i < items.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setRunning(false);
    setCurrentIndex(-1);
    toast.success("Batch import hoàn tất!");
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const progress = items.length > 0 ? ((doneCount + errorCount) / items.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !running && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Batch Import Tools
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nhập danh sách URL (mỗi dòng 1 URL)</Label>
              <Textarea
                rows={10}
                placeholder={"https://figma.com\nhttps://notion.so\nhttps://slack.com\nhttps://linear.app"}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tối đa 50 URL. AI sẽ tự động thu thập thông tin và tạo tool với trạng thái "pending_review".
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Hủy</Button>
              <Button onClick={parseUrls}>
                <Sparkles className="h-4 w-4 mr-2" /> Chuẩn bị Import ({urlsText.split("\n").filter((l) => l.trim()).length} URL)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {running && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang xử lý... ({doneCount + errorCount}/{items.length})</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="shrink-0">
                    {item.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                    {item.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {item.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.name || item.url}</p>
                    {item.error && <p className="text-xs text-destructive truncate">{item.error}</p>}
                  </div>
                  <Badge variant={
                    item.status === "done" ? "default" :
                    item.status === "error" ? "destructive" :
                    item.status === "processing" ? "secondary" : "outline"
                  } className="text-xs shrink-0">
                    {item.status === "pending" ? "Chờ" : item.status === "processing" ? "Đang xử lý" : item.status === "done" ? "Xong" : "Lỗi"}
                  </Badge>
                </div>
              ))}
            </div>

            {!running && doneCount + errorCount === items.length && items.length > 0 && (
              <div className="text-sm text-center py-2">
                <span className="text-green-600 font-medium">{doneCount} thành công</span>
                {errorCount > 0 && <span className="text-destructive font-medium ml-3">{errorCount} lỗi</span>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {!running && doneCount + errorCount < items.length && (
                <>
                  <Button variant="outline" onClick={() => setItems([])}>Quay lại</Button>
                  <Button onClick={startImport}>
                    <Sparkles className="h-4 w-4 mr-2" /> Bắt đầu Import
                  </Button>
                </>
              )}
              {!running && doneCount + errorCount === items.length && items.length > 0 && (
                <Button onClick={onClose}>Đóng</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
