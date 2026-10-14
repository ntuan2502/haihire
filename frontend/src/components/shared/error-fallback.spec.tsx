import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorFallback } from "./error-fallback";
import { I18nProvider } from "@/i18n";

describe("ErrorFallback Component Tests", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Something broke in rendering") as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders default variant with title, description, and navigation buttons", () => {
    render(
      <I18nProvider>
        <ErrorFallback error={mockError} reset={mockReset} />
      </I18nProvider>,
    );

    expect(screen.getByTestId("error-fallback-default")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again|thử lại/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home|về trang chủ/i })).toHaveAttribute("href", "/");
  });

  it("2. Calls reset callback when 'Try again' button is clicked", () => {
    render(
      <I18nProvider>
        <ErrorFallback error={mockError} reset={mockReset} />
      </I18nProvider>,
    );

    const tryAgainBtn = screen.getByRole("button", { name: /try again|thử lại/i });
    fireEvent.click(tryAgainBtn);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("3. Renders compact variant with inline layout structure", () => {
    render(
      <I18nProvider>
        <ErrorFallback
          error={mockError}
          reset={mockReset}
          variant="compact"
          titleKey="errors.boundary.dashboardTitle"
          descriptionKey="errors.boundary.dashboardDescription"
          homeHref="/dashboard"
          homeLabelKey="nav.dashboard"
        />
      </I18nProvider>,
    );

    expect(screen.getByTestId("error-fallback-compact")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard|tổng quan/i })).toHaveAttribute("href", "/dashboard");
  });

  it("4. Renders fullscreen variant with full-screen container classes", () => {
    render(
      <I18nProvider>
        <ErrorFallback error={mockError} reset={mockReset} variant="fullscreen" />
      </I18nProvider>,
    );

    const container = screen.getByTestId("error-fallback-fullscreen");
    expect(container).toHaveClass("min-h-screen");
  });

  it("5. Displays error digest when digest property is present on error", () => {
    const errorWithDigest = new Error("Failed chunk load") as Error & { digest?: string };
    errorWithDigest.digest = "NEXT_CHUNK_LOAD_12345";

    render(
      <I18nProvider>
        <ErrorFallback error={errorWithDigest} reset={mockReset} />
      </I18nProvider>,
    );

    expect(screen.getByText(/Digest: NEXT_CHUNK_LOAD_12345/)).toBeInTheDocument();
  });

  it("6. Operates gracefully without I18nProvider (standalone / global-error mode)", () => {
    // Render without I18nProvider wrapping
    render(<ErrorFallback error={mockError} reset={mockReset} variant="fullscreen" />);

    expect(screen.getByTestId("error-fallback-fullscreen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again|thử lại/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home|về trang chủ/i })).toBeInTheDocument();
  });
});
