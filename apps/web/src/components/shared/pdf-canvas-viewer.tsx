"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface PdfCanvasViewerProps {
  src: string;
  title: string;
  onError?: (err: unknown) => void;
  className?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

interface PdfPageCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  zoom: number;
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  containerWidth,
  zoom,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeRenderTask: RenderTask | null = null;

    async function renderPage() {
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(260, containerWidth - 24);
      const fitScale = availableWidth / unscaledViewport.width;
      const cssScale = fitScale * zoom;
      const viewport = page.getViewport({ scale: cssScale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;

      activeRenderTask = page.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });

      await activeRenderTask.promise;
    }

    renderPage().catch((err: unknown) => {
      if (cancelled) return;
      const errName =
        typeof err === "object" && err !== null && "name" in err
          ? String((err as { name?: unknown }).name)
          : "";
      if (
        errName === "RenderingCancelledException" ||
        errName === "AbortException"
      ) {
        return;
      }
      console.error(`Failed to render PDF page ${pageNumber}:`, err);
    });

    return () => {
      cancelled = true;
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, containerWidth, zoom]);

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        className="block rounded-md border border-border bg-white shadow-xs"
      />
    </div>
  );
}

export function PdfCanvasViewer({
  src,
  title,
  onError,
  className = "w-full h-full",
}: PdfCanvasViewerProps) {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(360);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PDFDocumentProxy | null = null;
    let loadingTask: { destroy: () => Promise<void> } | null = null;

    async function loadPdf() {
      setIsLoading(true);
      setPdfDoc(null);
      setPageCount(0);

      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading PDF buffer`);
      }
      const buffer = await response.arrayBuffer();
      if (cancelled) return;

      const pdfjs = await import("pdfjs-dist");
      if (cancelled) return;

      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
      loadingTask = task;

      const doc = await task.promise;
      if (cancelled) {
        await doc.cleanup();
        await task.destroy();
        return;
      }

      loadedDoc = doc;
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setIsLoading(false);
    }

    loadPdf().catch((err: unknown) => {
      if (cancelled) return;
      setIsLoading(false);
      onErrorRef.current?.(err);
    });

    return () => {
      cancelled = true;
      if (loadedDoc) {
        void loadedDoc.cleanup();
      }
      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [src]);

  const zoomPercentage = Math.round(zoom * 100);
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div
      data-testid="pdf-canvas-viewer"
      aria-label={title}
      className={cn("flex flex-col min-h-0 overflow-hidden", className)}
    >
      {/* Mobile PDF Controls Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/95 backdrop-blur-xs">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {t("candidates.pdfPageCount", { count: pageCount })}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setZoom((prev) =>
                Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))),
              )
            }
            disabled={zoom <= MIN_ZOOM || isLoading}
            aria-label={t("candidates.zoomOut")}
            title={t("candidates.zoomOut")}
            className="h-7 w-7 rounded-md border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 flex items-center justify-center cursor-pointer transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-foreground">
            {zoomPercentage}%
          </span>

          <button
            type="button"
            onClick={() =>
              setZoom((prev) =>
                Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))),
              )
            }
            disabled={zoom >= MAX_ZOOM || isLoading}
            aria-label={t("candidates.zoomIn")}
            title={t("candidates.zoomIn")}
            className="h-7 w-7 rounded-md border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 flex items-center justify-center cursor-pointer transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={zoom === 1 || isLoading}
            aria-label={t("candidates.resetZoom")}
            title={t("candidates.resetZoom")}
            className="h-7 px-2 rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer transition-colors ml-1"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span className="hidden xs:inline">
              {t("candidates.resetZoom")}
            </span>
          </button>
        </div>
      </div>

      {/* Scrollable Rendered Pages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-auto p-3 space-y-3 bg-muted/40"
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            <p className="text-xs font-medium">
              {t("candidates.loadingPreview")}
            </p>
          </div>
        )}

        {!isLoading &&
          pdfDoc &&
          pageNumbers.map((pageNumber) => (
            <PdfPageCanvas
              key={pageNumber}
              pdfDoc={pdfDoc}
              pageNumber={pageNumber}
              containerWidth={containerWidth}
              zoom={zoom}
            />
          ))}
      </div>
    </div>
  );
}
