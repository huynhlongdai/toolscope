import ReactMarkdown from "react-markdown";
import { DealsWidget } from "@/components/deals/DealsWidget";
import { ToolEmbedWidget } from "@/components/tools/ToolEmbedWidget";
import { BlockRenderer } from "@/components/content/BlockRenderer";

/**
 * Shared shortcode-aware content renderer, used by Blog / Page / Tool detail
 * so writers can embed live widgets straight from the rich-text editor
 * without leaving the content flow.
 *
 * Supported shortcodes:
 * - `[deals]` / `[deal]`   - all active deals for the current tool
 *                            (only works where a `toolId` is in scope, e.g.
 *                            inside a Tool detail article).
 * - `[deal:CODE]`          - with `toolId` in scope: one deal of that tool
 *                            filtered by coupon code (legacy behavior).
 *                            WITHOUT `toolId` (e.g. a blog post not tied to
 *                            one tool): looked up directly by the deal's own
 *                            `slug` column instead.
 * - `[tool:slug]`          - renders a compact ToolCard for the given tool,
 *                            usable anywhere (blog posts, pages, articles).
 */
const SPLIT_REGEX = /(\[deals?\]|\[deal:[^\]]+\]|\[tool:[^\]]+\])/g;
const DETECT_REGEX = /\[deals?\]|\[deal:[^\]]+\]|\[tool:[^\]]+\]/;

export function hasShortcodes(content: string): boolean {
  return DETECT_REGEX.test(content);
}

export function ShortcodeContent({
  content,
  isHtml,
  toolId,
  className,
}: {
  content: string;
  isHtml: boolean;
  toolId?: string;
  className?: string;
}) {
  if (!content) return null;

  if (!hasShortcodes(content)) {
    return isHtml ? (
      <BlockRenderer html={content} className={className} />
    ) : (
      <article className={className}><ReactMarkdown>{content}</ReactMarkdown></article>
    );
  }

  const parts = content.split(SPLIT_REGEX);

  return (
    <div>
      {parts.map((part, i) => {
        if (!part) return null;

        if (part === "[deals]" || part === "[deal]") {
          return toolId ? <DealsWidget key={i} toolId={toolId} /> : null;
        }

        const dealMatch = part.match(/^\[deal:([^\]]+)\]$/);
        if (dealMatch) {
          const identifier = dealMatch[1];
          return toolId ? (
            <DealsWidget key={i} toolId={toolId} couponCode={identifier} />
          ) : (
            <DealsWidget key={i} dealSlug={identifier} />
          );
        }

        const toolMatch = part.match(/^\[tool:([^\]]+)\]$/);
        if (toolMatch) {
          return <ToolEmbedWidget key={i} slug={toolMatch[1]} />;
        }

        if (isHtml) {
          return <BlockRenderer key={i} html={part} className={className} />;
        }
        return <article key={i} className={className}><ReactMarkdown>{part}</ReactMarkdown></article>;
      })}
    </div>
  );
}
