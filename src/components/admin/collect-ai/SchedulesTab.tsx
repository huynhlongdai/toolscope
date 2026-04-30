import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, Play, Trash2, Loader2 } from "lucide-react";
import { CRON_PRESETS } from "./types";
import type { useCollectAI } from "./useCollectAI";

type SchedulesTabProps = ReturnType<typeof useCollectAI>;

export function SchedulesTab(props: SchedulesTabProps) {
  const {
    categories, schedules,
    scheduleDialogOpen, setScheduleDialogOpen,
    scheduleForm, setScheduleForm,
    createScheduleMutation, toggleScheduleMutation,
    runScheduleMutation, deleteScheduleMutation,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Quản lý lịch thu thập tự động theo keyword</p>
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tạo lịch mới</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tạo lịch thu thập</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Keyword / URL</Label>
                <Input value={scheduleForm.keyword} onChange={e => setScheduleForm(p => ({ ...p, keyword: e.target.value }))} placeholder="VD: AI design tools" />
              </div>
              <div>
                <Label>Loại tìm kiếm</Label>
                <Select value={scheduleForm.search_type} onValueChange={v => setScheduleForm(p => ({ ...p, search_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Danh mục đích</Label>
                <Select value={scheduleForm.category_id} onValueChange={v => setScheduleForm(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Không chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tần suất</Label>
                <Select value={scheduleForm.cron_expression} onValueChange={v => setScheduleForm(p => ({ ...p, cron_expression: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createScheduleMutation.mutate()} disabled={!scheduleForm.keyword || createScheduleMutation.isPending}>
                {createScheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Tạo lịch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Tần suất</TableHead>
              <TableHead>Lần chạy cuối</TableHead>
              <TableHead>Tổng kết quả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-32">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có lịch trình. Tạo mới để bắt đầu.</TableCell></TableRow>
            ) : schedules.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm">{s.keyword}</TableCell>
                <TableCell><Badge variant="outline">{s.search_type}</Badge></TableCell>
                <TableCell className="text-xs">{CRON_PRESETS.find(p => p.value === s.cron_expression)?.label || s.cron_expression}</TableCell>
                <TableCell className="text-xs">{s.last_run_at ? new Date(s.last_run_at).toLocaleString("vi-VN") : "Chưa chạy"}</TableCell>
                <TableCell><Badge variant="secondary">{s.results_total}</Badge></TableCell>
                <TableCell>
                  <Switch checked={s.is_active} onCheckedChange={v => toggleScheduleMutation.mutate({ id: s.id, is_active: v })} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Chạy ngay" onClick={() => runScheduleMutation.mutate(s.id)} disabled={runScheduleMutation.isPending}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteScheduleMutation.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <Clock className="inline h-4 w-4 mr-1" />
            Lịch trình sẽ tự động thu thập tools theo tần suất đã cài đặt. Kết quả được lưu vào Staging để admin review và import.
            Bạn cũng có thể nhấn <Play className="inline h-3 w-3 mx-0.5" /> để chạy thủ công ngay lập tức.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
