import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Loader2, BookOpen, Info, Layers, Award, CreditCard,
  Users, Rocket, ThumbsUp, CheckCircle, List, ChevronDown, ChevronUp, ArrowUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface Section {
  title: string;
  content: string;
  id: string;
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
        sections.push({ title: currentTitle, content: currentLines.join("\n").trim(), id: slugify(currentTitle || "intro") });
      }
      currentTitle = headingMatch[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join("\n").trim(), id: slugify(currentTitle || "outro") });
  }

  return sections.filter((s) => s.title || s.content);
}

/* ── Prose class string ─────────────────────────────────── */
const proseClasses = cn(
  // base
  "prose prose-neutral dark:prose-invert max-w-none",
  // paragraphs
  "prose-p:text-muted-foreground prose-p:leading-[1.8] prose-p:mb-4",
  // headings
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
  // links
  "prose-a:text-primary prose-a:underline-offset-2 prose-a:decoration-primary/40 hover:prose-a:decoration-primary",
  // images
  "prose-img:rounded-lg prose-img:shadow-sm",
  // strong / emphasis
  "prose-strong:text-foreground prose-strong:font-semibold prose-em:text-muted-foreground",
  // lists
  "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
  "prose-li:leading-[1.8] prose-li:mb-2 prose-li:pl-1",
  "prose-ul:pl-6 prose-ol:pl-6 prose-ul:my-4 prose-ol:my-4",
  "prose-ul:list-disc prose-ol:list-decimal",
  "[&_ul]:marker:text-primary [&_ol]:marker:text-primary [&_ol]:marker:font-semibold",
  // blockquote
  "prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  // code
  "prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.85em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
  // table
  "prose-table:text-sm prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden",
  "prose-th:bg-muted/60 prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:border prose-th:border-border",
  "prose-td:p-3 prose-td:border prose-td:border-border prose-td:text-muted-foreground",
  // hr
  "prose-hr:border-border/50 prose-hr:my-6",
);

/* ── Collapsible Section Card ───────────────────────────── */
function SectionCard({ section, defaultOpen = true }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card id={`section-${section.id}`} className="overflow-hidden scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-muted/30 border-b border-border/50 px-6 py-3.5 text-left hover:bg-muted/50 transition-colors group"
      >
        <span className="flex items-center gap-2.5 text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {getIconForTitle(section.title)}
          {section.title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-5 pb-6">
            <article className={proseClasses}>
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </article>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

/* ── Back-to-top Button ──────────────────────────────────── */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-20 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
        "hover:scale-110 active:scale-95 transition-all duration-200",
        "animate-in fade-in slide-in-from-bottom-4"
      )}
      aria-label="Quay lại đầu trang"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export function DetailedArticle({ toolId, toolName, detailedContent, isAdmin }: DetailedArticleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);

  const sections = useMemo(() => {
    if (!detailedContent) return [];
    return parseSections(detailedContent);
  }, [detailedContent]);

  const tocSections = useMemo(() => sections.filter((s) => s.title), [sections]);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <BookOpen className="h-5 w-5 text-primary" /> Giới thiệu chi tiết về {toolName}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllExpanded(!allExpanded)}
            className="text-xs"
          >
            {allExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
            {allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}
          </Button>
          {isAdmin && generateButton("ghost", "Tạo lại")}
        </div>
      </div>

      {/* Table of Contents */}
      {tocSections.length > 1 && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              <List className="h-3.5 w-3.5" /> Mục lục
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-1">
            <nav>
              <ol className="grid gap-0.5 sm:grid-cols-2">
                {tocSections.map((section, idx) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary group"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {idx + 1}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {sections.map((section, idx) => {
        if (!section.content && !section.title) return null;

        // Intro text (no heading)
        if (!section.title) {
          return (
            <Card key={idx}>
              <CardContent className="py-6">
                <article className={proseClasses}>
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          );
        }

        return <SectionCard key={`${section.id}-${allExpanded}`} section={section} defaultOpen={allExpanded} />;
      })}

      {/* Back to top */}
      <BackToTop />
    </div>
  );
}
