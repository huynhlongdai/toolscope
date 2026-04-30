import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Clock, History } from "lucide-react";
import { useCollectAI } from "@/components/admin/collect-ai/useCollectAI";
import { SearchTab } from "@/components/admin/collect-ai/SearchTab";
import { StagingTab } from "@/components/admin/collect-ai/StagingTab";
import { SchedulesTab } from "@/components/admin/collect-ai/SchedulesTab";
import { HistoryTab } from "@/components/admin/collect-ai/HistoryTab";

export default function AdminCollectAI() {
  const hook = useCollectAI();
  const { activeTab, setActiveTab, pendingItems, approvedItems, schedules, sessions, setFilterSession } = hook;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">CollectAI</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Thu thập, quản lý và import công cụ AI tự động</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="search" className="gap-1 text-xs md:text-sm"><Search className="h-3.5 w-3.5" /> Tìm kiếm</TabsTrigger>
            <TabsTrigger value="staging" className="gap-1 text-xs md:text-sm"><Download className="h-3.5 w-3.5" /> Staging ({pendingItems.length + approvedItems.length})</TabsTrigger>
            <TabsTrigger value="schedules" className="gap-1 text-xs md:text-sm"><Clock className="h-3.5 w-3.5" /> Lịch trình ({schedules.length})</TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs md:text-sm"><History className="h-3.5 w-3.5" /> Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <SearchTab {...hook} />
          </TabsContent>

          <TabsContent value="staging" className="space-y-4">
            <StagingTab {...hook} />
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <SchedulesTab {...hook} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryTab
              sessions={sessions}
              onViewItems={(id) => { setFilterSession(id); setActiveTab("staging"); }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
