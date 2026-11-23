import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SkipToContent } from "./skip-to-content";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "common.skipToContent") return "Skip to main content";
      return key;
    },
  }),
}));

describe("SkipToContent Component", () => {
  it("renders an accessible skip link pointing to #main-content", () => {
    render(<SkipToContent />);

    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link).toHaveClass("sr-only");
    expect(link).toHaveClass("focus:not-sr-only");
  });
});
