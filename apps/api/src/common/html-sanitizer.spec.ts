import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "./html-sanitizer";

describe("sanitizeRichTextHtml", () => {
  it("strips dangerous XSS payloads, event handlers, iframes, and inline styles", () => {
    const dirty =
      '<h2 style="color:red">Role</h2>' +
      '<p onclick="alert(1)">Hello<script>alert("xss")</script></p>' +
      '<img src="x" onerror="alert(2)" />' +
      '<iframe src="https://evil.test"></iframe>' +
      '<a href="javascript:alert(3)">Bad</a>';

    const clean = sanitizeRichTextHtml(dirty);

    expect(clean).toContain("<h2>Role</h2>");
    expect(clean).toContain("<p>Hello</p>");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("style=");
    expect(clean).not.toContain("javascript:");
  });

  it("preserves allowed structural HTML and enforces safe external link attributes", () => {
    const safeHtml =
      '<h3>Requirements</h3><ul><li><strong>TypeScript</strong> &amp; <em>React</em></li></ul><p><a href="https://haihire.dev">Careers</a></p>';

    const clean = sanitizeRichTextHtml(safeHtml);

    expect(clean).toContain("<h3>Requirements</h3>");
    expect(clean).toContain("<ul><li><strong>TypeScript</strong>");
    expect(clean).toContain(
      '<a href="https://haihire.dev" target="_blank" rel="noopener noreferrer nofollow">Careers</a>',
    );
  });
});
