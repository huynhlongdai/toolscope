import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { sanitizeHtml } from "@/lib/sanitize";
import { hasContentBlocks } from "@/lib/content-blocks";
import { Callout } from "@/components/content/blocks/Callout";
import { CtaButton } from "@/components/content/blocks/CtaButton";

/**
 * Renders stored article HTML, swapping `data-block` elements for their React
 * components and leaving everything else as ordinary HTML.
 *
 * ## Why parse instead of `dangerouslySetInnerHTML`
 *
 * Blocks need real React components — a callout wants an icon, a CTA needs
 * `rel="sponsored"` applied in code rather than trusted to the author. Plain
 * `dangerouslySetInnerHTML` can only ever produce static markup.
 *
 * ## Safety
 *
 * Input is sanitized **before** parsing, so the tree handed to the parser is
 * already free of scripts and disallowed attributes. Parsing does not
 * reintroduce anything: unmapped elements are rebuilt as React elements from
 * the sanitized tree, never re-injected as raw HTML.
 *
 * ## Degradation
 *
 * An unrecognized `data-block` value is intentionally **not** an error. It
 * falls through to its underlying HTML, so content authored against a newer
 * block set still reads correctly on an older deploy instead of blanking out.
 */

/** Maps a block name to a component, given its attributes and children. */
const BLOCK_COMPONENTS: Record<
  string,
  (attribs: Record<string, string>, children: React.ReactNode) => React.ReactElement
> = {
  callout: (attribs, children) => (
    <Callout variant={attribs["data-variant"]}>{children}</Callout>
  ),
  cta: (attribs) => (
    <CtaButton
      href={attribs["data-href"]}
      label={attribs["data-label"]}
      sponsored={attribs["data-sponsored"]}
    />
  ),
};

export function BlockRenderer({ html, className }: { html: string; className?: string }) {
  if (!html) return null;

  const clean = sanitizeHtml(html);

  // No blocks in this document: skip the parser entirely. Most articles are
  // plain prose, and parsing the whole tree to find nothing would be wasted
  // work on every render.
  if (!hasContentBlocks(clean)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
  }

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      if (!(node instanceof Element)) return;
      const blockName = node.attribs?.["data-block"];
      if (!blockName) return;

      const render = BLOCK_COMPONENTS[blockName];
      // Unknown block -> return nothing, letting the parser emit the original
      // element as-is.
      if (!render) return;

      return render(node.attribs, domToReact(node.children as DOMNode[], options));
    },
  };

  return <div className={className}>{parse(clean, options)}</div>;
}
