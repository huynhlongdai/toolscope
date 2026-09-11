import { describe, it, expect } from "vitest";
import {
  detectContentFormat,
  isHtmlContent,
  markdownToHtml,
  normalizeToHtml,
  wasConverted,
} from "../content-format";

/**
 * Real content shapes taken from the production `blog_posts` table
 * (project yntzlkzckvxlfrrqmmwm) at the time this bug was found. All six
 * rows were Markdown while the editor was HTML-only.
 */
const REAL_MARKDOWN_POST = `## Step 1: Define Your Brief Template

Start with a consistent brief template covering audience, keywords, and tone.

## Step 2: Generate a Draft

Use an AI writing tool to generate the first pass.`;

const REAL_HTML_POST = `<h2>Overview</h2><p>Jasper AI has been one of the most recognizable names in AI writing.</p>`;

describe("detectContentFormat", () => {
  it("returns 'empty' for nullish and blank input", () => {
    expect(detectContentFormat(null)).toBe("empty");
    expect(detectContentFormat(undefined)).toBe("empty");
    expect(detectContentFormat("")).toBe("empty");
    expect(detectContentFormat("   \n\t  ")).toBe("empty");
  });

  it("detects HTML that the editor produced", () => {
    expect(detectContentFormat(REAL_HTML_POST)).toBe("html");
    expect(detectContentFormat("<p>hello</p>")).toBe("html");
    expect(detectContentFormat("  \n <div>wrapped</div>")).toBe("html");
  });

  it("detects the real Markdown posts that were breaking", () => {
    expect(detectContentFormat(REAL_MARKDOWN_POST)).toBe("markdown");
  });

  it("detects individual Markdown constructs", () => {
    expect(detectContentFormat("# Title")).toBe("markdown");
    expect(detectContentFormat("- one\n- two")).toBe("markdown");
    expect(detectContentFormat("1. first\n2. second")).toBe("markdown");
    expect(detectContentFormat("> quoted")).toBe("markdown");
    expect(detectContentFormat("```js\nconst a = 1;\n```")).toBe("markdown");
    expect(detectContentFormat("| a | b |\n| - | - |")).toBe("markdown");
    expect(detectContentFormat("see [docs](https://example.com)")).toBe("markdown");
    expect(detectContentFormat("this is **bold**")).toBe("markdown");
  });

  it("does not mistake a mid-sentence hash for a heading", () => {
    expect(detectContentFormat("<p>issue #42 was fixed</p>")).toBe("html");
  });

  it("treats a bare plain-text sentence as markdown so it gets wrapped", () => {
    expect(detectContentFormat("Just a sentence with no structure.")).toBe("markdown");
  });

  it("prefers HTML when HTML block tags dominate a mixed document", () => {
    const mixed = `<div><p>one</p><p>two</p><p>three</p><p>four</p><p>see [x](y)</p></div>`;
    expect(detectContentFormat(mixed)).toBe("html");
  });
});

describe("isHtmlContent", () => {
  it("agrees with detectContentFormat", () => {
    expect(isHtmlContent(REAL_HTML_POST)).toBe(true);
    expect(isHtmlContent(REAL_MARKDOWN_POST)).toBe(false);
    expect(isHtmlContent("")).toBe(false);
  });
});

describe("markdownToHtml", () => {
  it("converts headings, lists and emphasis", () => {
    const html = markdownToHtml("## Title\n\n- one\n- two\n\n**bold**");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("converts GFM tables — the construct that silently vanished before", () => {
    const html = markdownToHtml("| Tool | Price |\n| --- | --- |\n| Jasper | $49 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Tool</th>");
    expect(html).toContain("<td>Jasper</td>");
  });

  it("converts GFM strikethrough", () => {
    expect(markdownToHtml("~~gone~~")).toContain("<del>gone</del>");
  });

  it("does not turn single newlines into hard breaks", () => {
    const html = markdownToHtml("line one\nline two");
    expect(html).not.toContain("<br>");
  });

  it("returns empty string for blank input", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml("   ")).toBe("");
  });

  it("leaves site shortcodes intact as literal text", () => {
    // ShortcodeContent splits on these downstream; Markdown must not eat them.
    const html = markdownToHtml("Grab it here:\n\n[deal:SAVE20]\n\n[tool:jasper-ai]");
    expect(html).toContain("[deal:SAVE20]");
    expect(html).toContain("[tool:jasper-ai]");
  });
});

describe("normalizeToHtml", () => {
  it("converts the real Markdown post into structured HTML", () => {
    const html = normalizeToHtml(REAL_MARKDOWN_POST);
    expect(html).toContain("<h2>Step 1: Define Your Brief Template</h2>");
    expect(html).not.toContain("## Step 1");
  });

  it("leaves existing HTML untouched", () => {
    expect(normalizeToHtml(REAL_HTML_POST)).toBe(REAL_HTML_POST);
  });

  it("is idempotent — running it twice changes nothing further", () => {
    const once = normalizeToHtml(REAL_MARKDOWN_POST);
    const twice = normalizeToHtml(once);
    expect(twice).toBe(once);
  });

  it("returns empty string for nullish input", () => {
    expect(normalizeToHtml(null)).toBe("");
    expect(normalizeToHtml(undefined)).toBe("");
  });
});

describe("wasConverted", () => {
  it("flags markdown that needed upgrading", () => {
    expect(wasConverted(REAL_MARKDOWN_POST)).toBe(true);
  });

  it("does not flag HTML or empty content", () => {
    expect(wasConverted(REAL_HTML_POST)).toBe(false);
    expect(wasConverted("")).toBe(false);
  });
});
