import { Link } from "react-router-dom";
import { ExternalLink, Wrench } from "lucide-react";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ToolsUsedTool {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  website_url?: string | null;
  affiliate_url?: string | null;
}

export interface ToolUsedEntry {
  role?: string | null; // e.g. "Primary writing tool"
  tool: ToolsUsedTool;
}

interface ToolsUsedSidebarProps {
  tools: ToolUsedEntry[];
  className?: string;
}

/**
 * Sidebar card listing the tools referenced in a case study, each with a
 * short role description and a mini affiliate CTA link. Per Mockup 6.
 */
export function ToolsUsedSidebar({ tools, className }: ToolsUsedSidebarProps) {
  const { t } = useI18n();
  if (!tools || tools.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-bold text-foreground">
          {t("caseStudy.toolsUsed", "Tools Used in This Story")}
        </h3>
      </div>
      <ul className="space-y-3">
        {tools.map(({ role, tool }, i) => {
          const logo = getToolLogoUrl(tool.logo_url, tool.website_url);
          const affiliateUrl = tool.affiliate_url || tool.website_url;
          return (
            <li key={tool.id ?? i} className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                {logo ? (
                  <img src={logo} alt={tool.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  tool.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/tool/${tool.slug}`}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {tool.name}
                </Link>
                {role && <p className="text-xs text-muted-foreground">{role}</p>}
                {affiliateUrl && (
                  <a
                    href={affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t("caseStudy.visitTool", "Visit")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
