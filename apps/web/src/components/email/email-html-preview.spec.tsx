import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmailHtmlPreview } from "./email-html-preview";

describe("EmailHtmlPreview", () => {
  it("keeps untrusted markup in a sandbox without script or same-origin permissions", () => {
    const payload =
      '<img src=x onerror="localStorage.clear()"><script>alert(1)</script>';
    render(<EmailHtmlPreview title="Preview" body={payload} />);

    const frame = screen.getByTitle("Preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("srcdoc")).toContain("default-src 'none'");
    expect(frame.getAttribute("srcdoc")).toContain(payload);
    expect(document.querySelector("img[onerror]")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });
});
