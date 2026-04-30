import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CollectSession } from "./types";

interface HistoryTabProps {
  sessions: CollectSession[];
  onViewItems: (sessionId: string) => void;
}

export function HistoryTab({ sessions, onViewItems }: HistoryTabProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Truy vấn</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Kết quả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lịch sử</TableCell></TableRow>
            ) : sessions.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{new Date(s.created_at).toLocaleString("vi-VN")}</TableCell>
                <TableCell>
                  <Badge variant="outline">{s.search_type === "keyword" ? "Keyword" : "URL"}</Badge>
                  {s.metadata?.scheduled && <Badge variant="secondary" className="ml-1 text-xs">Auto</Badge>}
                </TableCell>
                <TableCell className="max-w-[300px]"><p className="text-sm truncate">{s.query}</p></TableCell>
                <TableCell>
                  <Badge variant={s.metadata?.data_source === "firecrawl" ? "default" : "secondary"} className="text-xs">
                    {s.metadata?.data_source === "firecrawl" ? "🔥 Firecrawl" : s.metadata?.data_source === "ai_fallback" ? "🤖 AI" : "—"}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant="secondary">{s.results_count} tools</Badge></TableCell>
                <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => onViewItems(s.id)}>Xem items</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
