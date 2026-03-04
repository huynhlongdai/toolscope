import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Image, RefreshCw } from "lucide-react";

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function CoverImageUpload({ value, onChange, label = "Ảnh bìa" }: CoverImageUploadProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File không được vượt quá 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Lỗi tải ảnh: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
    onChange(urlData.publicUrl);
    toast.success("Đã tải ảnh bìa!");
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <div className="relative group">
          <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
            <img src={value} alt="Cover" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
              Thay đổi
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onChange("")}>
              <X className="mr-1 h-3 w-3" /> Xóa
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 py-8 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors"
        >
          {uploading ? (
            <><RefreshCw className="h-5 w-5 animate-spin" /> Đang tải...</>
          ) : (
            <><Image className="h-5 w-5" /> Nhấn để tải ảnh bìa (hoặc nhập URL bên dưới)</>
          )}
        </button>
      )}
      <Input
        placeholder="Hoặc nhập URL ảnh..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs"
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
