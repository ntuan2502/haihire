import { describe, it, expect, vi, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserAvatar, clearFailedAvatarUrlCache } from "./user-avatar";
import { computeGravatarUrl } from "@/lib/avatar-image";

vi.mock("@/lib/api/client", () => ({
  resolveUserAvatarUrl: (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("/api/")) return url;
    return `/api${url.startsWith("/") ? "" : "/"}${url}`;
  },
}));

describe("UserAvatar", () => {
  beforeEach(() => {
    clearFailedAvatarUrlCache();
  });

  it("renders resolved image URL visibly on initial render without an initials flash on reload", () => {
    const { container } = render(
      <UserAvatar
        name="Alice Recruiter"
        avatarUrl="/auth/avatars/user-1?v=123"
      />,
    );

    const img = screen.getByRole("img", { name: "Alice Recruiter" });
    expect(img).toHaveAttribute("src", "/api/auth/avatars/user-1?v=123");
    expect(img).not.toHaveClass("opacity-0");
    expect(container).not.toHaveTextContent("AR");
  });

  it("renders external Gravatar URL as-is and falls back to initials when loading fails", () => {
    const onImageError = vi.fn();
    const { container, rerender } = render(
      <UserAvatar
        name="Alice Recruiter"
        avatarUrl="https://www.gravatar.com/avatar/abc123?s=256&d=404"
        onImageError={onImageError}
      />,
    );

    const img = screen.getByRole("img", { name: "Alice Recruiter" });
    expect(img).toHaveAttribute(
      "src",
      "https://www.gravatar.com/avatar/abc123?s=256&d=404",
    );

    fireEvent.error(img);

    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("AR");

    // Updating avatarUrl recovers and attempts the new URL
    rerender(
      <UserAvatar
        name="Alice Recruiter"
        avatarUrl="/auth/avatars/user-1?v=456"
      />,
    );

    const nextImg = screen.getByRole("img", { name: "Alice Recruiter" });
    expect(nextImg).toHaveAttribute("src", "/api/auth/avatars/user-1?v=456");
  });

  it("computes SHA-256 Gravatar URL from normalized lowercase email", async () => {
    if (!globalThis.crypto?.subtle) {
      vi.stubGlobal("crypto", webcrypto);
    }
    try {
      const url = await computeGravatarUrl("  Alice@Example.com  ");
      expect(url).toMatch(
        /^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{64}\?s=256&d=404$/,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("falls back to initials on cached 404 without firing an error event", async () => {
    const onImageError = vi.fn();
    const originalComplete = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "complete",
    );
    const originalNaturalWidth = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "naturalWidth",
    );

    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 0,
    });

    try {
      const { container } = render(
        <UserAvatar
          name="Admin Demo"
          avatarUrl="https://www.gravatar.com/avatar/missing?s=256&d=404"
          onImageError={onImageError}
        />,
      );

      await waitFor(() => {
        expect(onImageError).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
      });
      expect(container).toHaveTextContent("AD");
    } finally {
      if (originalComplete) {
        Object.defineProperty(
          HTMLImageElement.prototype,
          "complete",
          originalComplete,
        );
      }
      if (originalNaturalWidth) {
        Object.defineProperty(
          HTMLImageElement.prototype,
          "naturalWidth",
          originalNaturalWidth,
        );
      }
    }
  });

  it("immediately renders initials for subsequent mounts when URL already failed in session and notifies onImageError", () => {
    const failedUrl = "https://www.gravatar.com/avatar/missing2?s=256&d=404";
    const firstRender = render(
      <UserAvatar name="Admin Demo" avatarUrl={failedUrl} />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Admin Demo" }));
    firstRender.unmount();

    const secondErrorSpy = vi.fn();
    const { container } = render(
      <UserAvatar
        name="Admin Demo"
        avatarUrl={failedUrl}
        onImageError={secondErrorSpy}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("AD");
    expect(secondErrorSpy).toHaveBeenCalledTimes(1);
  });
});
