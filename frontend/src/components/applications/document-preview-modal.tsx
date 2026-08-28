"use client";

import React, { useEffect } from "react";
import { FileText, Download, X } from "lucide-react";
import type { CandidateDocument } from "@/types";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CandidateDocument | null;
  appId?: string;
  onDownload: (url: string, filename?: string, appId?: string) => void;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  appId,
  onDownload,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const getDocumentUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return `${apiUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header matching Screenshot 2 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
              {document.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(document.url, document.name, appId)}
              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Embedded Document Preview matching Screenshot 2 */}
        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
          <iframe
            src={getDocumentUrl(document.url)}
            className="w-full h-full border-0"
            title={document.name}
          />
        </div>
      </div>
    </div>
  );
}
