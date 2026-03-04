import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DetailedArticleProps {
  toolId: string;
  toolName: string;
  detailedContent?: string | null;
  isAdmin?: boolean;
}

export function DetailedArticle({ toolId, toolName, detailedContent, isAdmin }: DetailedArticleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const generateArticle = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool-article", {
        body: { tool_id: toolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Đã tạo bài viết!", description: "Bài giới thiệu chi tiết đã được lưu." });
      queryClient.invalidateQueries({ queryKey: ["tool"] });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (!detailedContent && !isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Giới thiệu chi tiết
          </CardTitle>
          {isAdmin && !detailedContent && (
            <Button variant="secondary" size="sm" onClick={generateArticle} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {generating ? "Đang tạo..." : "AI tạo bài viết"}
            </Button>
          )}
          {isAdmin && detailedContent && (
            <Button variant="ghost" size="sm" onClick={generateArticle} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Tạo lại
            </Button>
          )}
        </div>
      </CardHeader>
      {detailedContent ? (
        <CardContent>
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg">
            <ReactMarkdown>{detailedContent}</ReactMarkdown>
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có bài giới thiệu chi tiết. Nhấn "AI tạo bài viết" để tạo tự động.</p>
        </CardContent>
      )}
    </Card>
  );
}
