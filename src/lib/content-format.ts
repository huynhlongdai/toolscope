import { marked } from "marked";

/**
 * Content format normalization.
 *
 * ## Why this exists
 *
 * Historically `blog_posts.content` (and `pages.content`) has been written by
 * two different producers that disagreed on format:
 *
 * - **Seed data / AI edge functions** wrote **Markdown** (`## Heading`, `- item`).
 * - **`RichTextEditor` (Tiptap)** writes **HTML** — it is an HTML-only editor.
 *
 * Tiptap has no Markdown parser. When it was handed a Markdown string it did
 * not render it, it swallowed it as *literal text* — so the author saw a raw
 * `## Heading` in the editor, and the moment they pressed Save it was
 * round-tripped into `<p>## Heading</p>`, destroying the document structure
 * permanently. The public page then rendered exactly that literal garbage.
 *
 * These helpers close that hole: every string entering the editor is
 * normalized to HTML first, so old Markdown documents upgrade cleanly on
 * first edit instead of being corrupted by it.
 *
 * **HTML is the canonical storage format.** Markdown is only ever an *input*
 * we tolerate and convert — never something we write back out.
 */

/** Block-level tags that, when a document opens with one, mean "this is HTML". */
const HTML_OPENING_TAG =
  /^<(!doctype|html|head|body|div|section|article|main|aside|header|footer|nav|p|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|figure|figcaption|pre|img|hr|br|span|strong|em|a|iframe|video)\b/i;

/**
 * Markdown constructs that HTML would never contain as literal text.
 * Deliberately anchored per-line (`m` flag) — a stray `#` mid-sentence is not
 * a heading, but `## Foo` at the start of a line is.
 */
const MARKDOWN_SIGNALS: RegExp[] = [
  /^#{1,6}\s+\S/m, // ATX heading
  /^\s{0,3}[-*+]\s+\S/m, // unordered list
  /^\s{0,3}\d+\.\s+\S/m, // ordered list
  /^\s{0,3}>\s+\S/m, // blockquote
  /^\s{0,3}```/m, // fenced code
  /^\s{0,3}(?:[-*_]\s*){3,}$/m, // thematic break
  /^\s{0,3}\|.+\|\s*$/m, // GFM table row
  /\[[^\]]+\]\([^)]+\)/, // inline link
  /!\[[^\]]*\]\([^)]+\)/, // image
  /\*\*[^*\n]+\*\*/, // bold
  /(?:^|\s)__[^_\n]+__(?:\s|$)/, // bold (underscore)
];

/** Count of block-level HTML tags actually present anywhere in the string. */
function countHtmlBlockTags(input: string): number {
  const matches = input.match(
    /<\/?(?:div|p|h[1-6]|ul|ol|li|table|tr|td|th|blockquote|pre|figure|section|article)\b[^>]*>/gi,
  );
  return matches ? matches.length : 0;
}

/**
 * Best-effort format detection for a stored content string.
 *
 * Returns `"empty"` for blank input so callers can skip work entirely rather
 * than guessing a format for nothing.
 */
export function detectContentFormat(input: string | null | undefined): "html" | "markdown" | "empty" {
  if (!input) return "empty";
  const trimmed = input.trim();
  if (!trimmed) return "empty";

  // Fast path: a document that *opens* with a block tag is HTML. This is the
  // overwhelmingly common case for anything the editor has ever saved.
  if (HTML_OPENING_TAG.test(trimmed)) return "html";

  const markdownHits = MARKDOWN_SIGNALS.filter((re) => re.test(trimmed)).length;
  const htmlTags = countHtmlBlockTags(trimmed);

  // Markdown commonly contains a little inline HTML, and HTML fragments can
  // coincidentally contain something that looks like an inline link. Decide by
  // which signal dominates rather than by presence alone.
  if (markdownHits > 0 && markdownHits >= htmlTags) return "markdown";
  if (htmlTags > 0) return "html";

  // No structural signal either way: a bare sentence, or a plain-text
  // paragraph. Treat as Markdown so it gets wrapped in a <p> rather than
  // being injected raw.
  return "markdown";
}

/** Convenience predicate. `detectContentFormat` is the one doing the thinking. */
export function isHtmlContent(input: string | null | undefined): boolean {
  return detectContentFormat(input) === "html";
}

/**
 * Convert a Markdown string to HTML.
 *
 * GFM is on, so tables / strikethrough / task lists survive the conversion —
 * these are exactly the constructs that silently vanished before, because the
 * public renderer used `react-markdown` **without** `remark-gfm`.
 *
 * `breaks` is deliberately **off**: Markdown's "two spaces = <br>" rule is
 * what authors expect, and turning every newline into a `<br>` would litter
 * the converted documents with hard breaks Tiptap then treats as real nodes.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return "";
  const html = marked.parse(markdown, {
    gfm: true,
    breaks: false,
    async: false,
  }) as string;
  return html.trim();
}

/**
 * Normalize any stored content string to HTML.
 *
 * This is the function callers should reach for. It is **idempotent**:
 * feeding it HTML returns that HTML untouched, so it is safe to apply on
 * every load without progressively mangling documents.
 */
export function normalizeToHtml(input: string | null | undefined): string {
  const format = detectContentFormat(input);
  if (format === "empty") return "";
  if (format === "html") return (input as string).trim();
  return markdownToHtml(input as string);
}

/**
 * Did `normalizeToHtml` actually have to change this content?
 *
 * Used by the editor to decide whether to show the author a "this post was
 * upgraded from Markdown" notice, so a format conversion is never silent.
 */
export function wasConverted(input: string | null | undefined): boolean {
  return detectContentFormat(input) === "markdown";
}
