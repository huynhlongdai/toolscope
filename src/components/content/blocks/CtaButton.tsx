import { ArrowUpRight } from "lucide-react";

/**
 * Inline CTA block — a styled affiliate button placed in the content flow.
 *
 * Two compliance properties are enforced here in code rather than left to the
 * author, because an author cannot be relied on to remember them per article:
 *
 * - **`rel="sponsored"`** on every outbound link. Google requires affiliate and
 *   paid links to carry `sponsored` (or `nofollow`); omitting it is a link
 *   scheme violation.
 * - **A visible "liên kết tài trợ" label** next to the button. The FTC requires
 *   affiliate disclosure to be clear and conspicuous *in proximity to* the
 *   link — a site-wide footer notice does not satisfy this.
 *
 * `data-sponsored="false"` exists for the genuinely non-affiliate case (linking
 * to official docs, say), and only then are both the label and the `sponsored`
 * token dropped.
 */
export function CtaButton({
  href,
  label,
  sponsored,
}: {
  href?: string;
  label?: string;
  sponsored?: string;
}) {
  // A CTA with no destination is broken content, not a styling problem —
  // render nothing rather than an anchor that goes nowhere.
  if (!href) return null;

  const isSponsored = sponsored !== "false";
  const text = label?.trim() || "Xem chi tiết";

  return (
    <div className="not-prose my-6 flex flex-col items-start gap-2">
      <a
        href={href}
        target="_blank"
        rel={isSponsored ? "sponsored noopener noreferrer" : "noopener noreferrer"}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground no-underline transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {text}
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>
      {isSponsored && (
        <span className="text-xs text-muted-foreground">
          Liên kết tài trợ — chúng tôi có thể nhận hoa hồng nếu bạn mua qua link này.
        </span>
      )}
    </div>
  );
}
