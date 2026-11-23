import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewModal } from "./preview-modal";

vi.mock("@/i18n/optional", () => ({
  useOptionalI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    isReady: true,
    t: (key: string) => key,
  }),
}));

describe("PreviewModal component", () => {
  it("renders title, description, badge, headerActions, and children", () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={vi.fn()}
        title="Resume.pdf"
        description="PDF Preview"
        badge={<span>1.2 MB</span>}
        headerActions={<button type="button">Download</button>}
      >
        <div data-testid="preview-body">Document viewer</div>
      </PreviewModal>,
    );

    expect(screen.getByText("Resume.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF Preview")).toBeInTheDocument();
    expect(screen.getByText("1.2 MB")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("preview-body")).toBeInTheDocument();
  });

  it("toggles maximized state via button and lets maximize classes override panelClassName", () => {
    render(
      <PreviewModal
        isOpen={true}
        onClose={vi.fn()}
        title="Template Preview"
        panelClassName="sm:max-w-3xl h-[600px]"
        headerActions={({ isMaximized }) => (
          <span data-testid="header-state">{isMaximized ? "MAX" : "STD"}</span>
        )}
      >
        {({ isMaximized }) => (
          <div data-testid="body-state">{isMaximized ? "MAX" : "STD"}</div>
        )}
      </PreviewModal>,
    );

    expect(screen.getByTestId("header-state")).toHaveTextContent("STD");
    expect(screen.getByTestId("body-state")).toHaveTextContent("STD");

    fireEvent.click(screen.getByRole("button", { name: "common.maximize" }));

    expect(screen.getByTestId("header-state")).toHaveTextContent("MAX");
    expect(screen.getByTestId("body-state")).toHaveTextContent("MAX");
    expect(screen.getByRole("dialog")).toHaveClass("w-screen", "h-dvh");
    expect(
      screen.getByRole("button", { name: "common.restore" }),
    ).toBeInTheDocument();
  });

  it("resets maximized state on close and closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <PreviewModal
        isOpen={true}
        onClose={onClose}
        title="Email Preview"
        allowMaximize={true}
      >
        {({ isMaximized }) => (
          <div data-testid="max-flag">{isMaximized ? "yes" : "no"}</div>
        )}
      </PreviewModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.maximize" }));
    expect(screen.getByTestId("max-flag")).toHaveTextContent("yes");

    fireEvent.click(screen.getByRole("button", { name: "common.close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("max-flag")).toHaveTextContent("no");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
