import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, GitCompareArrows } from "lucide-react";

interface TranslationTableProps {
  translations: any[];
  isLoading: boolean;
  getEntityName: (t: any) => string;
  onEdit: (item: any) => void;
  onDiff: (item: any) => void;
}

export function TranslationTable({ translations, isLoading, getEntityName, onEdit, onDiff }: TranslationTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Bản dịch (preview)</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Cập nhật</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
          ) : translations.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có bản dịch</TableCell></TableRow>
          ) : (
            translations.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-sm">{getEntityName(t)}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.field_name}</Badge></TableCell>
                <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">{t.translated_text.slice(0, 100)}</TableCell>
                <TableCell>
                  <Badge variant={t.is_auto ? "secondary" : "default"} className="text-xs">
                    {t.is_auto ? "AI" : "Thủ công"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onDiff(t)} title="So sánh">
                    <GitCompareArrows className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(t)} title="Chỉnh sửa">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
