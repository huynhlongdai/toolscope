import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wrench, FileText, Bot, PenLine, Workflow, Tag } from "lucide-react";

interface TranslationStatsProps {
  toolPercent: number;
  blogPercent: number;
  translatedToolCount: number;
  totalTools: number;
  translatedBlogCount: number;
  totalBlogs: number;
  autoCount: number;
  manualCount: number;
  workflowPercent?: number;
  translatedWorkflowCount?: number;
  totalWorkflows?: number;
  dealPercent?: number;
  translatedDealCount?: number;
  totalDeals?: number;
}

export function TranslationStats({
  toolPercent, blogPercent,
  translatedToolCount, totalTools,
  translatedBlogCount, totalBlogs,
  autoCount, manualCount,
  workflowPercent = 0, translatedWorkflowCount = 0, totalWorkflows = 0,
  dealPercent = 0, translatedDealCount = 0, totalDeals = 0,
}: TranslationStatsProps) {
  const showWorkflow = totalWorkflows > 0;
  const showDeal = totalDeals > 0;
  const extraCols = (showWorkflow ? 1 : 0) + (showDeal ? 1 : 0);

  return (
    <div className={`grid gap-3 grid-cols-2 md:grid-cols-${4 + extraCols}`}>
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
      {showWorkflow && (
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Workflow className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Workflow</span>
            </div>
            <Progress value={workflowPercent} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">{translatedWorkflowCount}/{totalWorkflows} ({workflowPercent}%)</p>
          </CardContent>
        </Card>
      )}
      {showDeal && (
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Deals</span>
            </div>
            <Progress value={dealPercent} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">{translatedDealCount}/{totalDeals} ({dealPercent}%)</p>
          </CardContent>
        </Card>
      )}
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
