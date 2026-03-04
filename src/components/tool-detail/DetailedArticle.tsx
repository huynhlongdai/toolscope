import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, BookOpen, Info, Layers, Award, CreditCard, Users, Rocket, ThumbsUp, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DetailedArticleProps {
  toolId: string;
  toolName: string;
  detailedContent?: string | null;
  isAdmin?: boolean;
}

const sectionIcons: Record<string, React.ReactNode> = {
  "là gì": <Info className="h-5 w-5 text-primary" />,
  "tính năng": <Layers className="h-5 w-5 text-primary" />,
  "nổi bật": <Award className="h-5 w-5 text-amber-500" />,
  "bảng giá": <CreditCard className="h-5 w-5 text-emerald-500" />,
  "gói dịch vụ": <CreditCard className="h-5 w-5 text-emerald-500" />,
  "nên sử dụng": <Users className="h-5 w-5 text-blue-500" />,
  "hướng dẫn": <Rocket className="h-5 w-5 text-orange-500" />,
  "ưu điểm": <ThumbsUp className="h-5 w-5 text-green-500" />,
  "kết luận": <CheckCircle className="h-5 w-5 text-primary" />,
};

function getIconForTitle(title: string): React.ReactNode {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(sectionIcons)) {
    if (lower.includes(key)) return icon;
  }
  return <BookOpen className="h-5 w-5 text-primary" />;
}

interface Section {
  title: string;
  content: string;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
      }
      currentTitle = headingMatch[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
  }

  return sections.filter((s) => s.title || s.content);
}

export function DetailedArticle({ toolId, toolName, detailedContent, isAdmin }: DetailedArticleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const sections = useMemo(() => {
    if (!detailedContent) return [];
    return parseSections(detailedContent);
  }, [detailedContent]);

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

  const generateButton = (variant: "secondary" | "ghost" = "secondary", label = "AI tạo bài viết") => (
    <Button variant={variant} size="sm" onClick={generateArticle} disabled={generating}>
      {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
      {generating ? "Đang tạo..." : label}
    </Button>
  );

  if (!detailedContent) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Giới thiệu chi tiết
            </CardTitle>
            {isAdmin && generateButton()}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có bài giới thiệu chi tiết. Nhấn "AI tạo bài viết" để tạo tự động.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <BookOpen className="h-5 w-5 text-primary" /> Giới thiệu chi tiết về {toolName}
        </h2>
        {isAdmin && generateButton("ghost", "Tạo lại")}
      </div>

      {/* Sections */}
      {sections.map((section, idx) => {
        // Skip sections with no content
        if (!section.content && !section.title) return null;

        // Intro section (no title) renders differently
        if (!section.title) {
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-lg">
                {getIconForTitle(section.title)}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-table:text-sm prose-th:bg-muted/50 prose-th:p-2.5 prose-td:p-2.5 prose-th:text-left prose-table:border prose-th:border prose-td:border prose-table:border-border prose-th:border-border prose-td:border-border">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
