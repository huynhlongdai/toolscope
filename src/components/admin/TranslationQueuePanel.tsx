import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Play, Languages, Loader2, Trash2 } from "lucide-react";

interface QueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  priority: number;
  attempts: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  triggered_by: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partial: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function TranslationQueuePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch queue items
  const { data: queueItems, isLoading } = useQuery({
    queryKey: ["translation-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as QueueItem[];
    },
    refetchInterval: isProcessing ? 5000 : 30000,
  });

  // Fetch coverage stats
  const { data: coverage } = useQuery({
    queryKey: ["translation-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_coverage")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Process queue
  const processQueue = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke(
        "process-translation-queue"
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Queue processed",
        description: `Processed ${data.processed} items. ${data.remaining_in_queue} remaining.`,
      });
      queryClient.invalidateQueries({ queryKey: ["translation-queue"] });
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Error processing queue",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Batch enqueue
  const batchEnqueue = useMutation({
    mutationFn: async (entityType: string) => {
      const { data, error } = await supabase.rpc(
        "batch_enqueue_translations",
        { p_entity_type: entityType, p_limit: 100 }
      );
      if (error) throw error;
      return { count: data, entityType };
    },
    onSuccess: ({ count, entityType }) => {
      toast({
        title: "Batch enqueued",
        description: `Added ${count} ${entityType}s to translation queue.`,
      });
      queryClient.invalidateQueries({ queryKey: ["translation-queue"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear completed
  const clearCompleted = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("translation_queue")
        .delete()
        .in("status", ["completed", "partial"]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cleared completed items" });
      queryClient.invalidateQueries({ queryKey: ["translation-queue"] });
    },
  });

  const pendingCount =
    queueItems?.filter((i) => i.status === "pending").length || 0;
  const processingCount =
    queueItems?.filter((i) => i.status === "processing").length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{processingCount}</div>
            <div className="text-sm text-muted-foreground">Processing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {queueItems?.filter((i) => i.status === "completed").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {queueItems?.filter((i) => i.status === "failed").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Table */}
      {coverage && coverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" />
              Translation Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Locale</th>
                    <th className="p-2 text-right">Translated</th>
                    <th className="p-2 text-right">Auto</th>
                    <th className="p-2 text-right">Manual</th>
                    <th className="p-2 text-right">Needs Review</th>
                    <th className="p-2 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-2">{row.entity_type}</td>
                      <td className="p-2 font-mono">{row.locale}</td>
                      <td className="p-2 text-right">
                        {row.translated_entities}
                      </td>
                      <td className="p-2 text-right">
                        {row.auto_translations}
                      </td>
                      <td className="p-2 text-right">
                        {row.manual_translations}
                      </td>
                      <td className="p-2 text-right">{row.needs_review}</td>
                      <td className="p-2 text-right">
                        {row.avg_quality_score || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => processQueue.mutate()}
            disabled={processQueue.isPending || pendingCount === 0}
          >
            {processQueue.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Process Queue ({pendingCount})
          </Button>

          <Button
            variant="outline"
            onClick={() => batchEnqueue.mutate("tool")}
            disabled={batchEnqueue.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Batch: Tools
          </Button>
          <Button
            variant="outline"
            onClick={() => batchEnqueue.mutate("blog")}
            disabled={batchEnqueue.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Batch: Blogs
          </Button>
          <Button
            variant="outline"
            onClick={() => batchEnqueue.mutate("deal")}
            disabled={batchEnqueue.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Batch: Deals
          </Button>

          <Button
            variant="ghost"
            onClick={() => clearCompleted.mutate()}
            disabled={clearCompleted.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Completed
          </Button>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Queue Items ({queueItems?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !queueItems?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Queue is empty. Translations will be auto-queued when content is
              published.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Entity ID</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Source</th>
                    <th className="p-2 text-right">Attempts</th>
                    <th className="p-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{item.entity_type}</td>
                      <td className="p-2 font-mono text-xs">
                        {item.entity_id.slice(0, 8)}…
                      </td>
                      <td className="p-2">
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[item.status] || ""}
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-2">{item.triggered_by}</td>
                      <td className="p-2 text-right">{item.attempts}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
