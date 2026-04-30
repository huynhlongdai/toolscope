import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../sanitize";

describe("sanitizeHtml", () => {
  it("allows safe HTML tags", () => {
    const input = "<h1>Title</h1><p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("removes script tags (XSS prevention)", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  it("removes onerror event handlers", () => {
    const input = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("removes javascript: URLs from links", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("allows safe attributes on links", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("allows images with safe attributes", () => {
    const input = '<img src="https://example.com/img.png" alt="test" loading="lazy" />';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="https://example.com/img.png"');
    expect(result).toContain('alt="test"');
  });

  it("removes data attributes", () => {
    const input = '<div data-evil="payload">content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data-evil");
    expect(result).toContain("content");
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("allows table elements", () => {
    const input = "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
    expect(sanitizeHtml(input)).toBe(input);
  });
});
