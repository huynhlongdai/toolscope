import { Info, Lightbulb, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { isCalloutVariant, type CalloutVariant } from "@/lib/content-blocks";

/**
 * Callout block — a visually distinct aside for pricing caveats, tips and
 * limitations.
 *
 * Warning callouts in particular earn trust on affiliate content: they signal
 * the article is an evaluation rather than a promotional vehicle, which is also
 * what Google's reviews system looks for.
 */

/**
 * Exported so the editor's NodeView can render a callout with the *same*
 * classes the public page uses. Duplicating these styles is the one sure way
 * to make "what you see is what you get" quietly stop being true.
 */
export const CALLOUT_VARIANT_STYLES: Record<
  CalloutVariant,
  { wrapper: string; icon: string; Icon: typeof Info; label: string }
> = {
  info: {
    wrapper: "border-sky-500/30 bg-sky-50 dark:bg-sky-950/30",
    icon: "text-sky-600 dark:text-sky-400",
    Icon: Info,
    label: "Lưu ý",
  },
  tip: {
    wrapper: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: Lightbulb,
    label: "Mẹo",
  },
  warning: {
    wrapper: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
    label: "Cảnh báo",
  },
};

export function Callout({
  variant,
  children,
}: {
  variant?: string;
  children?: ReactNode;
}) {
  // Unknown/absent variants fall back to `info` rather than rendering nothing:
  // a typo in stored content must never blank out a paragraph of the article.
  const key: CalloutVariant = isCalloutVariant(variant) ? variant : "info";
  const { wrapper, icon, Icon, label } = CALLOUT_VARIANT_STYLES[key];

  return (
    <aside
      className={`not-prose my-6 flex gap-3 rounded-lg border-l-4 p-4 sm:p-5 ${wrapper}`}
      role="note"
      aria-label={label}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />
      {/* `prose` is re-applied inside so body copy keeps article typography,
          while `not-prose` on the wrapper stops the parent prose styles from
          fighting the callout's own padding and border. */}
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
