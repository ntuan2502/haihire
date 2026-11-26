import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthenticatedDocumentViewer } from "./authenticated-document-viewer";
import {
  buildDocumentDownloadPath,
  fetchAuthenticatedDocumentPreview,
} from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchAuthenticatedDocumentPreview: vi.fn(),
  };
});

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("./pdf-canvas-viewer", () => ({
  PdfCanvasViewer: ({ src, title }: { src: string; title: string }) => (
    <div data-testid="pdf-canvas-viewer" data-src={src} aria-label={title} />
  ),
}));

describe("AuthenticatedDocumentViewer", () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.revokeObjectURL = vi.fn();
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("fetches private MinIO resume via /applications/:id/documents/download and renders PDF iframe without sandbox", async () => {
    vi.mocked(fetchAuthenticatedDocumentPreview).mockResolvedValueOnce({
      blobUrl: "blob:http://localhost:13000/pdf-1",
      mimeType: "application/pdf",
      kind: "pdf",
    });

    render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-1",
          name: "Nguyen_Van_A_CV.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/cv.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        applicationId="app-123"
      />,
    );

    const expectedPath = buildDocumentDownloadPath({
      url: "/haihire-resumes/tenants/org-1/resumes/cv.pdf",
      name: "Nguyen_Van_A_CV.pdf",
      applicationId: "app-123",
      disposition: "inline",
    });

    await waitFor(() => {
      const iframe = screen.getByTitle("Nguyen_Van_A_CV.pdf");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "blob:http://localhost:13000/pdf-1",
      );
      expect(iframe).not.toHaveAttribute("sandbox");
      expect(iframe).toHaveAttribute("referrerPolicy", "no-referrer");
    });

    expect(fetchAuthenticatedDocumentPreview).toHaveBeenCalledWith(
      expectedPath,
      {
        mimeType: undefined,
        fileName: "Nguyen_Van_A_CV.pdf",
        url: "/haihire-resumes/tenants/org-1/resumes/cv.pdf",
      },
    );
  });

  it("prefers document.sourceApplicationId and falls back to /candidates/:id/documents/download when absent", async () => {
    vi.mocked(fetchAuthenticatedDocumentPreview).mockResolvedValue({
      blobUrl: "blob:http://localhost:13000/pdf-cand",
      mimeType: "application/pdf",
      kind: "pdf",
    });

    const { unmount } = render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-2",
          name: "Candidate_CV.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/cand.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        candidateId="cand-99"
      />,
    );

    await waitFor(() => {
      expect(fetchAuthenticatedDocumentPreview).toHaveBeenCalledWith(
        expect.stringMatching(/^\/candidates\/cand-99\/documents\/download\?/),
        expect.any(Object),
      );
    });

    unmount();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost:13000/pdf-cand",
    );
  });

  it("fails closed without requesting raw /haihire-resumes/ when neither applicationId nor candidateId is available", () => {
    render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-3",
          name: "Orphan.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/orphan.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
      />,
    );

    expect(fetchAuthenticatedDocumentPreview).not.toHaveBeenCalled();
    expect(
      screen.getByText("errors.cannotDownloadDocument"),
    ).toBeInTheDocument();
  });

  it("renders unsupported inline preview state with download fallback for .docx files", async () => {
    const onDownload = vi.fn();
    vi.mocked(fetchAuthenticatedDocumentPreview).mockResolvedValueOnce({
      blobUrl: "",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      kind: "unsupported",
    });

    render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-4",
          name: "Resume.docx",
          url: "/haihire-resumes/tenants/org-1/resumes/resume.docx",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        candidateId="cand-1"
        onDownload={onDownload}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("candidates.previewUnsupportedFormat"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "common.download" }));
    expect(onDownload).toHaveBeenCalledWith(
      "/haihire-resumes/tenants/org-1/resumes/resume.docx",
      "Resume.docx",
      undefined,
    );
  });

  it("displays error state and retries preview on click when fetch fails", async () => {
    vi.mocked(fetchAuthenticatedDocumentPreview)
      .mockRejectedValueOnce({
        response: { status: 403, data: { code: "FORBIDDEN" } },
      })
      .mockResolvedValueOnce({
        blobUrl: "blob:http://localhost:13000/pdf-retry",
        mimeType: "application/pdf",
        kind: "pdf",
      });

    render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-5",
          name: "Retry.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/retry.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        applicationId="app-1"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("candidates.previewUnavailable"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "candidates.retryPreview" }),
    );

    await waitFor(() => {
      expect(screen.getByTitle("Retry.pdf")).toHaveAttribute(
        "src",
        "blob:http://localhost:13000/pdf-retry",
      );
    });
  });

  it("renders PdfCanvasViewer on mobile user agents instead of iframe and notifies preview src", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      configurable: true,
    });

    vi.mocked(fetchAuthenticatedDocumentPreview).mockResolvedValueOnce({
      blobUrl: "blob:http://localhost:13000/mobile-pdf",
      mimeType: "application/pdf",
      kind: "pdf",
    });

    const onPreviewSrcChange = vi.fn();

    const { unmount } = render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-mobile",
          name: "Mobile_CV.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/mobile.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        applicationId="app-mobile"
        onPreviewSrcChange={onPreviewSrcChange}
      />,
    );

    await waitFor(() => {
      const canvasViewer = screen.getByTestId("pdf-canvas-viewer");
      expect(canvasViewer).toBeInTheDocument();
      expect(canvasViewer).toHaveAttribute(
        "data-src",
        "blob:http://localhost:13000/mobile-pdf",
      );
      expect(canvasViewer).toHaveAttribute("aria-label", "Mobile_CV.pdf");
    });

    expect(screen.queryByTitle("Mobile_CV.pdf")).not.toBeInTheDocument();
    expect(onPreviewSrcChange).toHaveBeenCalledWith(
      "blob:http://localhost:13000/mobile-pdf",
    );

    unmount();
    expect(onPreviewSrcChange).toHaveBeenLastCalledWith(null);
  });

  it("supports forceCanvasPdf override for rendering PDF.js canvas view", async () => {
    vi.mocked(fetchAuthenticatedDocumentPreview).mockResolvedValueOnce({
      blobUrl: "blob:http://localhost:13000/forced-pdf",
      mimeType: "application/pdf",
      kind: "pdf",
    });

    render(
      <AuthenticatedDocumentViewer
        document={{
          id: "doc-forced",
          name: "Forced_CV.pdf",
          url: "/haihire-resumes/tenants/org-1/resumes/forced.pdf",
          type: "Resume",
          createdAt: "2026-11-11T00:00:00.000Z",
        }}
        applicationId="app-forced"
        forceCanvasPdf={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pdf-canvas-viewer")).toHaveAttribute(
        "data-src",
        "blob:http://localhost:13000/forced-pdf",
      );
    });
  });
});
