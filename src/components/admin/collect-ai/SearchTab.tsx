import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Globe, Sparkles, Loader2, Zap, Database, PackageCheck, Hourglass, BarChart3, FileText, Upload, CheckCircle } from "lucide-react";
import type { useCollectAI } from "./useCollectAI";

type SearchTabProps = ReturnType<typeof useCollectAI>;

export function SearchTab(props: SearchTabProps) {
  const {
    stats, searchQuery, setSearchQuery, searchType, setSearchType,
    selectedCategory, setSelectedCategory, categories, contentText, setContentText,
    searchMutation, uploadingFile, fileInputRef, handleFileUpload,
    bulkCollecting, bulkProgress, handleBulkCollect,
  } = props;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Tổng collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Hourglass className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.pending ?? 0}</p>
              <p className="text-xs text-muted-foreground">Chờ duyệt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.approved ?? 0}</p>
              <p className="text-xs text-muted-foreground">Đã duyệt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <PackageCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.imported ?? 0}</p>
              <p className="text-xs text-muted-foreground">Đã import</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.sessions ?? 0}</p>
              <p className="text-xs text-muted-foreground">Phiên thu thập</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Collect Button */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Thu thập hàng loạt 500 tool
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tự động thu thập ~500 tool từ 25 danh mục phổ biến bằng AI, lưu vào hàng chờ duyệt.
            </p>
            {bulkProgress && (
              <div className="mt-2 text-xs space-y-1">
                <p className="text-primary font-medium">
                  ✅ Đã thu thập {bulkProgress.total} tool từ {bulkProgress.keywords} keyword
                </p>
                <details className="cursor-pointer">
                  <summary className="text-muted-foreground">Chi tiết từng keyword</summary>
                  <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                    {bulkProgress.results.map((r: any, idx: number) => (
                      <li key={idx} className={r.error ? "text-destructive" : "text-foreground"}>
                        {r.keyword}: {r.error || `${r.count} tool`}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
          <Button onClick={handleBulkCollect} disabled={bulkCollecting} className="shrink-0">
            {bulkCollecting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Đang thu thập...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-1" /> Thu thập 500 tool</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Tìm kiếm công cụ</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={searchType} onValueChange={(v: "keyword" | "url" | "text") => setSearchType(v)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword"><Search className="inline h-3 w-3 mr-1" />Theo keyword</SelectItem>
                <SelectItem value="url"><Globe className="inline h-3 w-3 mr-1" />Theo URL</SelectItem>
                <SelectItem value="text"><FileText className="inline h-3 w-3 mr-1" />Từ văn bản/file</SelectItem>
              </SelectContent>
            </Select>
            {searchType !== "text" && (
              <>
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={searchType === "keyword" ? "VD: AI writing tools..." : "VD: https://..."}
                  className="flex-1" onKeyDown={e => e.key === "Enter" && searchQuery && searchMutation.mutate()} />
                <Button onClick={() => searchMutation.mutate()} disabled={!searchQuery || searchMutation.isPending}>
                  {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  Thu thập
                </Button>
              </>
            )}
          </div>

          {searchType === "text" && (
            <div className="space-y-3">
              <Textarea
                value={contentText}
                onChange={e => setContentText(e.target.value)}
                placeholder="Paste nội dung chứa danh sách công cụ AI vào đây... (VD: danh sách từ blog, báo cáo, tài liệu...)"
                className="min-h-[160px]"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Button onClick={() => searchMutation.mutate()} disabled={!contentText.trim() || searchMutation.isPending}>
                  {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Phân tích văn bản
                </Button>
                <span className="text-sm text-muted-foreground">hoặc</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.xlsx,.xls,.csv,.md,.txt,.markdown"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload file
                </Button>
                <span className="text-xs text-muted-foreground">PDF, Excel, CSV, Markdown, TXT</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Danh mục:</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tất cả" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(searchMutation.isPending || uploadingFile) && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Đang phân tích dữ liệu với AI...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
