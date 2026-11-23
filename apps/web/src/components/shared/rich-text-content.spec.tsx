import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichTextContent } from "./rich-text-content";

describe("RichTextContent", () => {
  it("strips dangerous XSS tags, event handlers, and javascript URLs from HTML", () => {
    const { container } = render(
      <RichTextContent
        content={
          '<h2>Overview</h2><p onclick="alert(1)">Hello<script>alert("xss")</script></p>' +
          '<img src="x" onerror="alert(2)" />' +
          '<a href="javascript:alert(3)">Click</a>'
        }
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Overview",
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("onclick");
    expect(container.innerHTML).not.toContain("javascript:");
  });

  it("renders legacy plain text using whitespace-pre-line fallback", () => {
    render(<RichTextContent content={"Line one\nLine two"} />);

    const el = screen.getByText(/Line one/);
    expect(el.className).toContain("whitespace-pre-line");
    expect(el.textContent).toBe("Line one\nLine two");
  });
});
