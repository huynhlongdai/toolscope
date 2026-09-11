import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlockRenderer } from "../BlockRenderer";
import { sanitizeHtml } from "@/lib/sanitize";
import { BLOCK_DATA_ATTRS } from "@/lib/content-blocks";

describe("sanitize + block attribute contract", () => {
  // This is the load-bearing test for the whole block architecture: if
  // sanitization strips data-block, every block silently loses its identity on
  // the public page while still looking correct in the editor.
  it("preserves every registered block data attribute", () => {
    const html = `<div data-block="callout" data-variant="warning"><p>hi</p></div>`;
    const clean = sanitizeHtml(html);
    expect(clean).toContain('data-block="callout"');
    expect(clean).toContain('data-variant="warning"');
  });

  it("preserves CTA attributes", () => {
    const html = `<div data-block="cta" data-href="https://x.com" data-label="Try it" data-sponsored="true"></div>`;
    const clean = sanitizeHtml(html);
    expect(clean).toContain('data-href="https://x.com"');
    expect(clean).toContain('data-label="Try it"');
  });

  it("still strips unregistered data attributes", () => {
    // ALLOW_DATA_ATTR stays false precisely so this holds.
    const clean = sanitizeHtml(`<div data-block="callout" data-evil="payload">x</div>`);
    expect(clean).toContain('data-block="callout"');
    expect(clean).not.toContain("data-evil");
  });

  it("still strips scripts and event handlers", () => {
    const clean = sanitizeHtml(`<div data-block="callout" onclick="alert(1)">x</div><script>alert(2)</script>`);
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("<script");
  });

  it("registry exposes data-block plus each block's own attributes", () => {
    expect(BLOCK_DATA_ATTRS).toContain("data-block");
    expect(BLOCK_DATA_ATTRS).toContain("data-variant");
    expect(BLOCK_DATA_ATTRS).toContain("data-href");
    // No duplicates - the registry de-dupes shared attribute names.
    expect(new Set(BLOCK_DATA_ATTRS).size).toBe(BLOCK_DATA_ATTRS.length);
  });
});

describe("BlockRenderer", () => {
  it("renders plain HTML untouched when there are no blocks", () => {
    render(<BlockRenderer html="<p>just prose</p>" />);
    expect(screen.getByText("just prose")).toBeInTheDocument();
  });

  it("renders a callout as a component, preserving its inner content", () => {
    render(<BlockRenderer html={`<div data-block="callout" data-variant="warning"><p>price changed</p></div>`} />);
    const note = screen.getByRole("note");
    expect(note).toBeInTheDocument();
    expect(note).toHaveAttribute("aria-label", "Cảnh báo");
    expect(screen.getByText("price changed")).toBeInTheDocument();
  });

  it("falls back to the info variant for an unknown variant", () => {
    render(<BlockRenderer html={`<div data-block="callout" data-variant="nonsense"><p>x</p></div>`} />);
    expect(screen.getByRole("note")).toHaveAttribute("aria-label", "Lưu ý");
  });

  it("renders a CTA with rel=sponsored and a proximate disclosure", () => {
    render(<BlockRenderer html={`<div data-block="cta" data-href="https://jasper.ai" data-label="Try Jasper Free"></div>`} />);
    const link = screen.getByRole("link", { name: /Try Jasper Free/ });
    expect(link).toHaveAttribute("href", "https://jasper.ai");
    expect(link.getAttribute("rel")).toContain("sponsored");
    expect(screen.getByText(/Liên kết tài trợ/)).toBeInTheDocument();
  });

  it("drops the sponsored token and disclosure when explicitly non-affiliate", () => {
    render(<BlockRenderer html={`<div data-block="cta" data-href="https://docs.x.com" data-label="Docs" data-sponsored="false"></div>`} />);
    const link = screen.getByRole("link", { name: /Docs/ });
    expect(link.getAttribute("rel")).not.toContain("sponsored");
    expect(screen.queryByText(/Liên kết tài trợ/)).not.toBeInTheDocument();
  });

  it("renders nothing for a CTA with no destination", () => {
    render(<BlockRenderer html={`<div data-block="cta" data-label="Broken"></div>`} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("degrades an unknown block to its underlying HTML instead of blanking", () => {
    // Content authored against a newer block set must still read correctly on
    // an older deploy.
    render(<BlockRenderer html={`<div data-block="future-thing"><p>still readable</p></div>`} />);
    expect(screen.getByText("still readable")).toBeInTheDocument();
  });

  it("renders blocks and surrounding prose together, in order", () => {
    render(
      <BlockRenderer
        html={`<p>before</p><div data-block="callout" data-variant="tip"><p>inside</p></div><p>after</p>`}
      />,
    );
    expect(screen.getByText("before")).toBeInTheDocument();
    expect(screen.getByText("inside")).toBeInTheDocument();
    expect(screen.getByText("after")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveAttribute("aria-label", "Mẹo");
  });

  it("does not execute or emit scripts smuggled into block content", () => {
    const { container } = render(
      <BlockRenderer html={`<div data-block="callout"><p>ok</p><script>window.__pwned=1</script></div>`} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect((window as any).__pwned).toBeUndefined();
  });
});
