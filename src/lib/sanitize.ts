import DOMPurify from "dompurify";
import { BLOCK_DATA_ATTRS } from "@/lib/content-blocks";

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Allows safe tags for rich content rendering.
 *
 * The editor's presentation blocks (callout, CTA, ...) mark themselves up with
 * `data-block` attributes, so those must survive sanitization or a block would
 * render correctly in the editor and then silently lose its identity — and its
 * styling — on the public page.
 *
 * The allowlist is derived from `BLOCK_DATA_ATTRS` rather than hand-maintained
 * here, so registering a new block cannot forget this file.
 *
 * `ALLOW_DATA_ATTR` stays **false** on purpose. Verified empirically that
 * DOMPurify honours explicitly-listed `data-*` entries in `ALLOWED_ATTR` even
 * with the flag off — which keeps unknown data attributes (`data-evil="..."`)
 * stripped, whereas flipping the flag to `true` lets every one of them through.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "strong", "em", "b", "i", "u", "s", "del", "ins",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span",
      "figure", "figcaption",
      "video", "source", "iframe",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "src", "alt", "title", "width", "height",
      "class", "style",
      "colspan", "rowspan",
      "allow", "allowfullscreen", "frameborder",
      "loading",
      ...BLOCK_DATA_ATTRS,
    ],
    ALLOW_DATA_ATTR: false,
  });
}
