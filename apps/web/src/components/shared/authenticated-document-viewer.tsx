"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { CandidateDocument } from "@/types";
import {
  buildDocumentDownloadPath,
  fetchAuthenticatedDocumentPreview,
  getDocumentUrl,
  type DocumentPreviewKind,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";

export interface AuthenticatedDocumentViewerProps {
  document: CandidateDocument;
  applicationId?: string;
  candidateId?: string;
  onDownload?: (
    url: string,
    filename: string,
    appId?: string,
  ) => void | Promise<void>;
  className?: string;
}

type ViewerState =
  | { status: "loading" }
  | { status: "ready"; src: string; kind: DocumentPreviewKind; isBlob: boolean }
  | { status: "unsupported" }
  | {
      status: "error";
      error?: unknown;
      fallbackKey:
        "errors.cannotDownloadDocument" | "candidates.previewUnavailable";
    };

/**
 * Fetches candidate/application documents via tenant-authenticated API download
 * endpoints and renders PDFs/images safely from same-origin Object URLs.
 */
export function AuthenticatedDocumentViewer({
  document,
  applicationId,
  candidateId,
  onDownload,
  className = "w-full h-full",
}: AuthenticatedDocumentViewerProps) {
  const { t } = useI18n();
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const activeBlobUrlRef = useRef<string | null>(null);

  const effectiveAppId = document.sourceApplicationId || applicationId;

  const revokeActiveBlob = useCallback(() => {
    if (activeBlobUrlRef.current) {
      window.URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    revokeActiveBlob();

    const downloadPath = buildDocumentDownloadPath({
      url: document.url,
      name: document.name,
      applicationId: effectiveAppId,
      candidateId,
      disposition: "inline",
    });

    if (!downloadPath) {
      // Allow non-MinIO static files (e.g. demo resumes), but fail closed for private MinIO paths
      const fallbackUrl = getDocumentUrl(document.url, {
        name: document.name,
        applicationId: effectiveAppId,
        candidateId,
      });
      if (!fallbackUrl) {
        setState({
          status: "error",
          fallbackKey: "errors.cannotDownloadDocument",
        });
        return;
      }
      setState({
        status: "ready",
        src: fallbackUrl,
        kind: "pdf",
        isBlob: false,
      });
      return;
    }

    setState({ status: "loading" });

    fetchAuthenticatedDocumentPreview(downloadPath, {
      mimeType: document.mimeType,
      fileName: document.name,
      url: document.url,
    })
      .then((result) => {
        if (cancelled) {
          if (result.blobUrl) {
            window.URL.revokeObjectURL(result.blobUrl);
          }
          return;
        }
        if (result.kind === "unsupported" || !result.blobUrl) {
          setState({ status: "unsupported" });
          return;
        }
        activeBlobUrlRef.current = result.blobUrl;
        setState({
          status: "ready",
          src: result.blobUrl,
          kind: result.kind,
          isBlob: true,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: "error",
          error: err,
          fallbackKey: "candidates.previewUnavailable",
        });
      });

    return () => {
      cancelled = true;
      revokeActiveBlob();
    };
  }, [
    document.url,
    document.name,
    document.mimeType,
    effectiveAppId,
    candidateId,
    reloadToken,
    revokeActiveBlob,
  ]);

  if (state.status === "loading") {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-2.5 p-6 text-center text-slate-500 dark:text-slate-400`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-medium">{t("candidates.loadingPreview")}</p>
      </div>
    );
  }

  if (state.status === "error") {
    const detailMessage = state.error
      ? getApiErrorMessage(state.error, t, state.fallbackKey) ||
        t(state.fallbackKey)
      : t(state.fallbackKey);

    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-3 p-6 text-center`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t("candidates.previewUnavailable")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {detailMessage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("candidates.retryPreview")}</span>
          </button>
          {onDownload && (
            <button
              type="button"
              onClick={() =>
                onDownload(document.url, document.name, effectiveAppId)
              }
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("common.download")}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.status === "unsupported") {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-3 p-6 text-center`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {document.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("candidates.previewUnsupportedFormat")}
          </p>
        </div>
        {onDownload && (
          <button
            type="button"
            onClick={() =>
              onDownload(document.url, document.name, effectiveAppId)
            }
            className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("common.download")}</span>
          </button>
        )}
      </div>
    );
  }

  if (state.kind === "image") {
    return (
      <div
        className={`${className} flex items-center justify-center overflow-auto p-4`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.src}
          alt={document.name}
          className="max-w-full max-h-full object-contain rounded-lg shadow-xs"
        />
      </div>
    );
  }

  return (
    <iframe
      src={state.src}
      className={`${className} border-0`}
      referrerPolicy="no-referrer"
      title={document.name}
    />
  );
}
