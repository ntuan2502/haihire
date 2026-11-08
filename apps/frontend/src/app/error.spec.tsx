import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RootError from "./error";
import DashboardError from "./dashboard/error";
import CareersError from "./careers/error";
import NotFound from "./not-found";
import { I18nProvider } from "@/i18n";

describe("Next.js Error Boundaries & Not-Found Integration Tests", () => {
  const mockReset = vi.fn();
  const sampleError = new Error("Integration test error") as Error & { digest?: string };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. RootError renders ErrorFallback with default variant", () => {
    render(
      <I18nProvider>
        <RootError error={sampleError} reset={mockReset} />
      </I18nProvider>,
    );

    expect(screen.getByTestId("error-fallback-default")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again|thử lại/i })).toBeInTheDocument();
  });

  it("2. DashboardError renders ErrorFallback with compact variant and dashboard link", () => {
    render(
      <I18nProvider>
        <DashboardError error={sampleError} reset={mockReset} />
      </I18nProvider>,
    );

    expect(screen.getByTestId("error-fallback-compact")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard|tổng quan/i })).toHaveAttribute("href", "/dashboard");

    const tryAgain = screen.getByRole("button", { name: /try again|thử lại/i });
    fireEvent.click(tryAgain);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("3. CareersError renders ErrorFallback with careers home link", () => {
    render(
      <I18nProvider>
        <CareersError error={sampleError} reset={mockReset} />
      </I18nProvider>,
    );

    expect(screen.getByTestId("error-fallback-default")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home|về trang chủ/i })).toHaveAttribute("href", "/careers");
  });

  it("4. NotFound component renders 404 page with navigation links", () => {
    render(
      <I18nProvider>
        <NotFound />
      </I18nProvider>,
    );

    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home|về trang chủ/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /dashboard|tổng quan/i })).toHaveAttribute("href", "/dashboard");
  });
});
