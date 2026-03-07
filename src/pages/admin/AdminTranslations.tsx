import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Globe, FileText } from "lucide-react";
import { ContentTranslationsTab } from "@/components/admin/translations/ContentTranslationsTab";
import { SystemTranslationsTab } from "@/components/admin/translations/SystemTranslationsTab";

export default function AdminTranslations() {
  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Languages className="h-6 w-6 md:h-7 md:w-7" /> Quản lý bản dịch
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Quản lý dịch thuật nội dung và giao diện hệ thống
          </p>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="content" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Dịch nội dung
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              Dịch hệ thống
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <ContentTranslationsTab />
          </TabsContent>

          <TabsContent value="system" className="mt-4">
            <SystemTranslationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
