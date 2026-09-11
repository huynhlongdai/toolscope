import { describe, it, expect } from "vitest";
import { generateJSON, generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { CalloutNode } from "../CalloutNode";
import { CtaNode } from "../CtaNode";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Schema round-trip tests.
 *
 * This is the load-bearing guarantee for the block architecture. A block only
 * survives if `renderHTML` emits markup that `parseHTML` can read back — if
 * those two ever disagree, opening a post and saving it silently destroys
 * every block in it. That is precisely the class of bug this whole effort
 * exists to fix, so it gets asserted rather than assumed.
 *
 * `generateJSON` / `generateHTML` exercise the schema only, with no editor
 * instance and no React NodeViews — so what is measured here is the storage
 * contract itself.
 */

const extensions = [StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }), CalloutNode, CtaNode];

/** Parse HTML into the editor's document model and serialize it straight back. */
const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe("callout round-trip", () => {
  it("survives parse -> serialize unchanged in structure", () => {
    const html = `<div data-block="callout" data-variant="warning"><p>Price changed</p></div>`;
    const out = roundTrip(html);
    expect(out).toContain('data-block="callout"');
    expect(out).toContain('data-variant="warning"');
    expect(out).toContain("Price changed");
  });

  it("is stable across repeated open-and-save cycles", () => {
    // Every edit session is another round-trip. Drift would compound.
    const html = `<div data-block="callout" data-variant="tip"><p>Use annual billing</p></div>`;
    const once = roundTrip(html);
    const twice = roundTrip(once);
    const thrice = roundTrip(twice);
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
  });

  it("keeps rich content inside the callout body", () => {
    const html = `<div data-block="callout" data-variant="info"><p>See <strong>pricing</strong></p><ul><li>one</li><li>two</li></ul></div>`;
    const out = roundTrip(html);
    expect(out).toContain("<strong>pricing</strong>");
    // Note the <p> wrapper: StarterKit's listItem schema requires a paragraph
    // inside each item, so Tiptap rewrites <li>one</li> as <li><p>one</p></li>.
    // That is Tiptap's normalization, not block behaviour - it applies to every
    // list in the app and predates these nodes. Asserted explicitly so the
    // expectation is recorded rather than rediscovered.
    expect(out).toContain("<li><p>one</p></li>");
    expect(out).toContain("<li><p>two</p></li>");
  });

  it("defaults the variant when the attribute is absent", () => {
    const out = roundTrip(`<div data-block="callout"><p>x</p></div>`);
    expect(out).toContain('data-variant="info"');
  });

  it("does not swallow surrounding prose", () => {
    const html = `<p>before</p><div data-block="callout" data-variant="info"><p>inside</p></div><p>after</p>`;
    const out = roundTrip(html);
    expect(out).toContain("before");
    expect(out).toContain("inside");
    expect(out).toContain("after");
    expect(out.indexOf("before")).toBeLessThan(out.indexOf("inside"));
    expect(out.indexOf("inside")).toBeLessThan(out.indexOf("after"));
  });
});

describe("CTA round-trip", () => {
  it("preserves all three attributes", () => {
    const html = `<div data-block="cta" data-href="https://jasper.ai/?ref=astute" data-label="Try Jasper Free" data-sponsored="true"></div>`;
    const out = roundTrip(html);
    expect(out).toContain('data-href="https://jasper.ai/?ref=astute"');
    expect(out).toContain('data-label="Try Jasper Free"');
    expect(out).toContain('data-sponsored="true"');
  });

  it("preserves the non-affiliate flag", () => {
    const out = roundTrip(`<div data-block="cta" data-href="https://docs.x" data-label="Docs" data-sponsored="false"></div>`);
    expect(out).toContain('data-sponsored="false"');
  });

  it("is stable across repeated cycles", () => {
    const html = `<div data-block="cta" data-href="https://x.com" data-label="Go" data-sponsored="true"></div>`;
    const once = roundTrip(html);
    expect(roundTrip(once)).toBe(once);
  });
});

describe("sanitize does not undo the round-trip", () => {
  it("keeps blocks intact through the full editor -> storage -> render path", () => {
    // The real pipeline: editor serializes, DB stores, renderer sanitizes.
    // Each stage is fine alone; this asserts the composition is too.
    const authored = `<p>intro</p><div data-block="callout" data-variant="warning"><p>careful</p></div><div data-block="cta" data-href="https://x.com" data-label="Buy" data-sponsored="true"></div>`;
    const stored = roundTrip(authored);
    const rendered = sanitizeHtml(stored);

    expect(rendered).toContain('data-block="callout"');
    expect(rendered).toContain('data-variant="warning"');
    expect(rendered).toContain('data-block="cta"');
    expect(rendered).toContain('data-href="https://x.com"');
    expect(rendered).toContain('data-label="Buy"');
    expect(rendered).toContain("careful");
  });
});

describe("legacy content is unharmed by the new nodes", () => {
  it("leaves ordinary prose untouched", () => {
    const html = `<h2>Overview</h2><p>Jasper has been around since 2021.</p><ul><li>a</li></ul>`;
    const out = roundTrip(html);
    expect(out).toContain("<h2>Overview</h2>");
    expect(out).toContain("since 2021");
    // Tiptap's listItem normalization again - see the callout test above.
    expect(out).toContain("<li><p>a</p></li>");
  });

  it("leaves shortcodes as literal text for ShortcodeContent to split on", () => {
    const out = roundTrip(`<p>[deal:SAVE20]</p><p>[tool:jasper-ai]</p>`);
    expect(out).toContain("[deal:SAVE20]");
    expect(out).toContain("[tool:jasper-ai]");
  });
});
