/**
 * Content block registry — the single source of truth for the editor's
 * presentation blocks.
 *
 * ## The design, and why
 *
 * A block is plain HTML carrying a `data-block` marker:
 *
 * ```html
 * <div data-block="callout" data-variant="warning">
 *   <p>Pricing changed in August 2026.</p>
 * </div>
 * ```
 *
 * That choice keeps three things true at once:
 *
 * 1. **Storage never changes.** Content stays HTML in `blog_posts.content`.
 *    Every off-the-shelf block editor (BlockNote, Plate, Editor.js, Yoopta)
 *    stores a proprietary JSON tree instead, which would force a migration of
 *    all existing content *and* a rewrite of the public render path.
 * 2. **Rendering degrades safely.** A block whose React component is missing
 *    still renders as its underlying HTML — never a blank page.
 * 3. **Sanitization cannot drift.** The DOMPurify allowlist in
 *    `src/lib/sanitize.ts` is *derived from this registry*. Adding a block
 *    here cannot silently have its attributes stripped at render time, which
 *    is exactly the failure that would make a new block look fine in the
 *    editor and vanish on the live site.
 *
 * When adding a block: add it here first, then add its React component to
 * `src/components/content/blocks/` and its Tiptap node to
 * `src/components/admin/editor-blocks/`.
 */

/** Every block name the editor can produce. */
export const BLOCK_NAMES = [
  "callout",
  "cta",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];

/**
 * Data attributes each block carries, beyond the `data-block` marker itself.
 * These are the *only* data attributes sanitization will let through, so this
 * list is a security boundary as much as a schema.
 */
export const BLOCK_ATTRS: Record<BlockName, readonly string[]> = {
  callout: ["data-variant"],
  cta: ["data-href", "data-label", "data-sponsored"],
};

/** Callout tones. `info` is the fallback for anything unrecognized. */
export const CALLOUT_VARIANTS = ["info", "tip", "warning"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export function isCalloutVariant(value: string | undefined): value is CalloutVariant {
  return !!value && (CALLOUT_VARIANTS as readonly string[]).includes(value);
}

/**
 * The complete set of `data-*` attributes used by blocks.
 *
 * Consumed by `sanitizeHtml()`. Deliberately an explicit allowlist rather than
 * DOMPurify's `ALLOW_DATA_ATTR: true`: that flag lets *any* data attribute
 * through, which would turn every block into an injection surface for
 * attributes we never designed for.
 */
export const BLOCK_DATA_ATTRS: readonly string[] = [
  "data-block",
  ...Array.from(new Set(Object.values(BLOCK_ATTRS).flat())),
];

/** Does this HTML contain at least one block? Cheap pre-check for the renderer. */
export function hasContentBlocks(html: string): boolean {
  return /\sdata-block\s*=/.test(html);
}
