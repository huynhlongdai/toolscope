import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wrench, FileText, Bot, PenLine } from "lucide-react";

interface TranslationStatsProps {
  toolPercent: number;
  blogPercent: number;
  translatedToolCount: number;
  totalTools: number;
  translatedBlogCount: number;
  totalBlogs: number;
  autoCount: number;
  manualCount: number;
}

export function TranslationStats({
  toolPercent, blogPercent,
  translatedToolCount, totalTools,
  translatedBlogCount, totalBlogs,
  autoCount, manualCount,
}: TranslationStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Tools</span>
          </div>
          <Progress value={toolPercent} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">{translatedToolCount}/{totalTools} ({toolPercent}%)</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Blog</span>
          </div>
          <Progress value={blogPercent} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">{translatedBlogCount}/{totalBlogs} ({blogPercent}%)</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI dịch</span>
          </div>
          <p className="text-2xl font-bold">{autoCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-2">
            <PenLine className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Thủ công</span>
          </div>
          <p className="text-2xl font-bold">{manualCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
